pragma solidity ^0.5.0;

import "./lib/IPoLC.sol";
import "./lib/TokenUtil.sol";
import "./lib/LiBA/Struct.sol";
import "./lib/LiBA/Asker.sol";
import "./lib/LiBA/Bidder.sol";
import "./lib/LiBA/Util.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/payment/PullPayment.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title LiBA
 * @notice Contract allows service providers to send assets stored in PoLC through auction.
 */
contract LiBA is Ownable, Pausable, TokenUtil, PullPayment, WhitelistedRole {
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using LiBABidder for LiBAStruct.Auction;
    using LiBAAsker for LiBAStruct.Auction;

    uint constant private RATE_PRECISION = 100000;

    IPoLC private polc;
    uint private auctionCount;
    bool private enableWhitelist;
    IERC20 public celerToken;
    mapping(uint => LiBAStruct.Auction) private auctions;
    mapping(address => mapping(uint => LiBAStruct.Bid)) public bidsByUser;

    event NewAuction(uint auctionId, address asker);
    event NewBid(uint auctionId, address indexed bidder);
    event UpdateBid(uint auctionId, address bidder);
    event RevealBid(uint indexed auctionId, address bidder);
    event ClaimWinners(uint indexed auctionId, address[] winners, address topLoser);
    event ChallengeWinners(uint indexed auctionId, address challenger, address[] winners, address topLoser);
    event FinalizeAuction(uint auctionId);
    event FinalizeBid(uint auctionId, address bidder);
    event RepayAuction(uint auctionId);
    event CollectCollateral(uint auctionId, address winner);

    constructor(
        address _celerTokenAddress,
        address _polcAddress,
        bool _enableWhitelist
    )
        public
    {
        celerToken = IERC20(_celerTokenAddress);
        polc = IPoLC(_polcAddress);
        enableWhitelist = _enableWhitelist;

        // Enable eth support by default
        supportedTokens[address(0)] = true;
    }

    /**
     * @notice Check if the sender is in the whitelist
     */
    modifier libaWhitelistCheck() {
        if (enableWhitelist) {
            require(
                isWhitelisted(msg.sender),
                "WhitelistedRole: caller does not have the Whitelisted role"
            );
        }
        _;
    }

    function() external payable { }

    function updateEnableWhitelist(bool _enable) external onlyOwner {
        enableWhitelist = _enable;
    }

    /**
     * @notice Launch a new auction
     * @param _tokenAddress Token address to borrow
     * @param _bidDuration Duration for bidding
     * @param _revealDuration Duration for revealing
     * @param _claimDuration Duration for claiming
     * @param _challengeDuration Duration for challenging
     * @param _finalizeDuration Duration for finalizing
     * @param _value Total value asked
     * @param _duration Duration for the lending
     * @param _maxRate Maximum rate accepted
     * @param _minValue Minimum value accepted
     * @param _minCelerValue Minimum celer value when bidding
     * @param _collateralAddress Collateral token address
     * @param _collateralValue Collateral value
     */
    function initAuction(
        address _tokenAddress,
        uint _bidDuration,
        uint _revealDuration,
        uint _claimDuration,
        uint _challengeDuration,
        uint _finalizeDuration,
        uint _value,
        uint _duration,
        uint _maxRate,
        uint _minValue,
        uint _minCelerValue,
        address _collateralAddress,
        uint _collateralValue
    )
        external
        payable
        whenNotPaused
        libaWhitelistCheck
        validateToken(_collateralAddress, _collateralValue)
    {
        require(supportedTokens[_tokenAddress], "token address must be supported");
        require(_bidDuration > 0, "bid duration must be larger than zero");
        require(_revealDuration > 0, "reveal duration must be larger than zero");
        require(_claimDuration > 0, "claim duration must be larger than zero");
        require(_challengeDuration > 0, "challenge duration must be larger than zero");
        require(_finalizeDuration > 0, "finalize duration must be larger than zero");
        require(_value > 0, "value must be larger than zero");
        require(_duration > 0, "duration must be larger than zero");

        if (_collateralAddress != address(0)) {
            IERC20(_collateralAddress).safeTransferFrom(msg.sender, address(this), _collateralValue);
        }

        LiBAStruct.Auction storage auction = auctions[auctionCount];
        auction.asker = msg.sender;
        auction.tokenAddress = _tokenAddress;
        auction.collateralAddress = _collateralAddress;
        auction.collateraValue = _collateralValue;
        auction.challengeDuration = _challengeDuration;
        auction.finalizeDuration = _finalizeDuration;
        auction.value = _value;
        auction.duration = _duration;
        auction.maxRate = _maxRate;
        auction.minValue = _minValue;
        auction.minCelerValue = _minCelerValue;
        auction.bidEnd = block.number.add(_bidDuration);
        auction.revealEnd = auction.bidEnd.add(_revealDuration);
        auction.claimEnd = auction.revealEnd.add(_claimDuration);
        auction.challengeEnd = auction.claimEnd.add(_challengeDuration);
        auction.finalizeEnd = auction.challengeEnd.add(_finalizeDuration);

        emit NewAuction(auctionCount, auction.asker);
        auctionCount = auctionCount.add(1);
    }

    /**
     * @notice Bid for an auction during the bidding period. If called more than once,
     * it will update the existing bid for the sender. However, when the bid is updated,
     * the previous Celer value will be forfeited
     * @param _auctionId Id of the auction
     * @param _hash Hash calculated from desired rate, value, celerValue and salt
     * @param _celerValue Potential celer value for bidding, it can be larger than actual celer value
     */
    function placeBid(
        uint _auctionId,
        bytes32 _hash,
        uint _celerValue
    )
        external
        whenNotPaused
    {
        LiBAStruct.Auction storage auction = auctions[_auctionId];
        LiBAStruct.Bid storage bid = bidsByUser[msg.sender][_auctionId];

        if (bid.hash == 0) {
            auction.bidders.push(msg.sender);
            emit NewBid(_auctionId, msg.sender);
        } else {
            emit UpdateBid(_auctionId, msg.sender);
        }

        auction.placeBid(bid, celerToken, _hash, _celerValue);
    }

    /**
     * @notice Reveal the bid of current user for an auction during the revealing period.
     * It will calculate hash based on rate, value, celer value, and salt,
     * and check if it is same as the hash provided in the bidding period.
     * It will also check if commitment in PoLC has enough fund
     * @param _auctionId Id of the auction
     * @param _rate Interest rate for bidding
     * @param _value Value for bidding
     * @param _celerValue Celer value for bidding
     * @param _salt A random value used for hash
     * @param _commitmentId Commitment Id in PoLC belong to the sender
     */
    function revealBid(
        uint _auctionId,
        uint _rate,
        uint _value,
        uint _celerValue,
        uint _salt,
        uint _commitmentId
    )
        external
        whenNotPaused
    {
        LiBAStruct.Auction storage auction = auctions[_auctionId];
        LiBAStruct.Bid storage bid = bidsByUser[msg.sender][_auctionId];

        auction.revealBid(bid, polc, celerToken, _rate, _value, _celerValue, _salt, _commitmentId);
        emit RevealBid(_auctionId, msg.sender);
    }

    /**
     * @notice The auction asker claims winners for the auction during the claim period
     * @param _auctionId Id of the auction
     * @param _winners A list of winner addresses
     * @param _topLoser The loser who has the highest rank
     */
    function claimWinners(
        uint _auctionId,
        address[] calldata _winners,
        address _topLoser
    )
        external
        whenNotPaused
    {
        LiBAStruct.Auction storage auction = auctions[_auctionId];

        auction.claimWinners(_winners, _topLoser);
        emit ClaimWinners(_auctionId, _winners, _topLoser);
    }

    /**
     * @notice A potential winner, who is not claimed as one of the winners,
     * is able to challenge the auction during the challenge period
     * @param _auctionId Id of the auction
     * @param _winners A list of winner addresses
     * @param _topLoser The loser who has the highest rank
     */
    function challengeWinners(
        uint _auctionId,
        address[] calldata _winners,
        address _topLoser
    )
        external
        whenNotPaused
    {
        LiBAStruct.Auction storage auction = auctions[_auctionId];
        require(block.number > auction.claimEnd, "must be within challenge");
        require(block.number <= auction.challengeEnd, "must be within challenge duration");
        require(_validateChallenger(_auctionId, msg.sender), "must be a valid challenger");
        require(LiBAUtil._validateTopLoser(auction.bidders ,_winners, _topLoser), "invalid top loser");

        auction.winners = _winners;
        auction.challengeEnd = auction.challengeEnd.add(auction.challengeDuration);
        auction.finalizeEnd = auction.challengeEnd.add(auction.finalizeDuration);

        emit ChallengeWinners(_auctionId, msg.sender, _winners, _topLoser);
    }

    /**
     * @notice Finalize the auction by withdrawing money from PoLC commitments during finalize period
     * @param _auctionId Id of the auction
     */
    function finalizeAuction(uint _auctionId) external whenNotPaused {
        LiBAStruct.Auction storage auction = auctions[_auctionId];

        auction.finalizeAuction(bidsByUser, polc, celerToken, _auctionId);
        celerToken.safeTransferFrom(msg.sender, address(this), auction.feeDeposit);
        _transfer(auction.tokenAddress, auction.asker, auction.value);

        emit FinalizeAuction(_auctionId);
    }

    /**
     * @notice Finalize the bid for bidders, who are not selected as winners,
     * or the asker fails to finalize the auction before finalize period
     * @param _auctionId Id of the auction
     */
    function finalizeBid(uint _auctionId) external whenNotPaused {
        LiBAStruct.Auction storage auction = auctions[_auctionId];
        LiBAStruct.Bid storage bid = bidsByUser[msg.sender][_auctionId];

        auction.finalizeBid(bid, celerToken, polc);
        emit FinalizeBid(_auctionId, msg.sender);
    }

    /**
     * @notice Repay the auction with original assets and interests after lending ends
     * It will send collateral back to asker if there is any
     * @param _auctionId Id of the auction
     */
    function repayAuction(uint _auctionId) external payable whenNotPaused {
        LiBAStruct.Auction storage auction = auctions[_auctionId];
        require(auction.finalized, "auction must be finalized");
        require(msg.sender == auction.asker, "sender must be the auction asker");
        require(block.timestamp <= auction.lendingStart.add(auction.duration.mul(1 days)),  "must be within auction lending duration");

        IERC20 token = IERC20(auction.tokenAddress);
        uint value = msg.value;
        uint totalCelerValue = 0;
        uint actualDuration = block.timestamp.sub(auction.lendingStart).div(1 days);
        LiBAStruct.Bid storage topLoserBid = bidsByUser[auction.topLoser][_auctionId];

        for (uint i = 0; i < auction.winners.length; i++) {
            address winner = auction.winners[i];
            LiBAStruct.Bid storage winnerBid = bidsByUser[winner][_auctionId];
            uint bidValue = winnerBid.value;
            if (bidValue == 0) {
                break;
            }

            uint interest = bidValue.mul(topLoserBid.rate).mul(actualDuration).div(RATE_PRECISION);
            winnerBid.value = 0;
            totalCelerValue = totalCelerValue.add(winnerBid.celerValue);

            if (auction.tokenAddress == address(0)) {
                value = value.sub(bidValue).sub(interest);
                polc.repayCommitment.value(bidValue)(winner, winnerBid.commitmentId, auction.asker, bidValue);
                _asyncTransfer(winner, interest);
            } else {
                polc.repayCommitment(winner, winnerBid.commitmentId, auction.asker, bidValue);
                token.safeTransferFrom(auction.asker, winner, interest);
            }
        }

        if (auction.collateraValue > 0) {
            _transfer(auction.collateralAddress, auction.asker, auction.collateraValue);
            auction.collateraValue = 0;
        }

        celerToken.safeTransfer(auction.asker, auction.feeDeposit);
        uint borrowFee = polc.calculateAuctionFee(auction.tokenAddress, auction.value, actualDuration);
        if (totalCelerValue < borrowFee){
            borrowFee = borrowFee.sub(totalCelerValue);
            celerToken.safeTransferFrom(auction.asker, address(polc), borrowFee);
        }

        emit RepayAuction(_auctionId);
    }

    /**
     * @notice Collect the collateral of the auction if lending is not repaid
     * @param _auctionId Id of the auction
     */
    function collectCollateral(uint _auctionId) external whenNotPaused {
        LiBAStruct.Auction storage auction = auctions[_auctionId];
        LiBAStruct.Bid storage bid = bidsByUser[msg.sender][_auctionId];

        uint collateralReward = auction.collectCollateral(bid);
        _transfer(auction.collateralAddress, msg.sender, collateralReward);
        emit CollectCollateral(_auctionId, msg.sender);
    }

    /**
     * @notice Get auction info
     * @param _auctionId Id of the auction
     */
    function getAuction(
        uint _auctionId
    )
        external
        view
        returns (
            address asker,
            address tokenAddress,
            address collateralAddress,
            uint collateraValue,
            uint value,
            uint duration,
            uint maxRate,
            uint minValue
        )
    {
        LiBAStruct.Auction storage auction = auctions[_auctionId];

        asker = auction.asker;
        tokenAddress = auction.tokenAddress;
        collateralAddress = auction.collateralAddress;
        collateraValue = auction.collateraValue;
        value = auction.value;
        duration = auction.duration;
        maxRate = auction.maxRate;
        minValue = auction.minValue;
    }

    /**
     * @notice Get auction period
     * @param _auctionId Id of the auction
     */
    function getAuctionPeriod(
        uint _auctionId
    )
        external
        view
        returns (
            uint bidEnd,
            uint revealEnd,
            uint claimEnd,
            uint challengeEnd,
            uint finalizeEnd,
            bool finalized
        )
    {
        LiBAStruct.Auction storage auction = auctions[_auctionId];

        bidEnd = auction.bidEnd;
        revealEnd = auction.revealEnd;
        claimEnd = auction.claimEnd;
        challengeEnd = auction.challengeEnd;
        finalizeEnd = auction.finalizeEnd;
        finalized = auction.finalized;
    }

    /**
     * @notice Validate if challenger is valid one
     * @param _auctionId Id of the auction
     * @param _challenger Address for challenger, who may have higher score than current winners
     */
    function _validateChallenger(
        uint _auctionId,
        address _challenger
    )
        internal
        view
        returns(bool)
    {
        LiBAStruct.Bid storage challengerBid = bidsByUser[_challenger][_auctionId];
        if (challengerBid.value == 0) {
            return false;
        }

        LiBAStruct.Auction storage auction = auctions[_auctionId];
        address[] storage winners = auction.winners;
        bool isHigherRank = false;
        bool isWinner = false;
        uint totalValue = 0;

        for (uint i = 0; i < winners.length; i++) {
            address winner = winners[i];
            LiBAStruct.Bid storage winnerBid = bidsByUser[winner][_auctionId];

            // Too many winners
            if (totalValue >= auction.value && i < winners.length) {
                return true;
            }

            totalValue = totalValue.add(winnerBid.value);

            if (winner == _challenger) {
                isWinner = true;
            }

            if (!isHigherRank) {
                if (_hasHigherRank(challengerBid, winnerBid)) {
                    // The winner order is not right
                    if (!isWinner) {
                        return true;
                    }

                    isHigherRank = true;
                }
            }
        }

        if (isWinner) {
            return false;
        }

        // Not enough winners claimed
        if (totalValue < auction.value) {
            return true;
        }

        return isHigherRank;
    }

    /**
     * @notice Compare bids of corresponding bidders, return true if bidder0 has a higher rank
     * @param _bid0  A bid
     * @param _bid1 A bid
     */
    function _hasHigherRank(
        LiBAStruct.Bid storage _bid0,
        LiBAStruct.Bid storage _bid1
    )
        internal
        view
        returns(bool)
    {
        if (_bid0.rate > _bid1.rate) {
            return false;
        }

        if (_bid0.rate < _bid1.rate) {
            return true;
        }

        return _bid0.celerValue > _bid1.celerValue;
    }
}
