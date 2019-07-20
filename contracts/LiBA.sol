pragma solidity ^0.5.0;

import "./lib/IPoLC.sol";
import "./lib/TokenUtil.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/payment/PullPayment.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract LiBA is Pausable, TokenUtil, PullPayment, WhitelistedRole {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    struct Bid {
        bytes32 hash;
        uint commitmentId;
        uint rate;
        uint value;
        uint celerValue;
    }

    struct Auction {
        address payable asker;
        address tokenAddress;
        address collateralAddress;
        uint collateraValue;
        uint value;
        uint duration;
        uint maxRate;
        uint minValue;
        bool finalized;
        address[] bidders;
        address[] winners;
        uint challengeDuration;
        uint finalizeDuration;
        uint bidEnd;
        uint revealEnd;
        uint claimEnd;
        uint challengeEnd;
        uint finalizeEnd;
    }

    IPoLC private polc;
    uint private auctionCount;
    bool private enableWhitelist;
    IERC20 public celerToken;
    mapping(uint => Auction) private auctions;
    mapping(address => mapping(uint => Bid)) public bidsByUser;

    event NewAuction(uint auctionId, address asker);
    event NewBid(uint auctionId, address bidder);
    event UpdateBid(uint auctionId, address bidder);
    event RevealBid(uint indexed auctionId, address bidder);
    event ClaimWinners(uint indexed auctionId, address[] winners);
    event ChallengeWinners(uint indexed auctionId, address challenger, address[] winners);
    event FinalizeAuction(uint auctionId);
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
            IERC20(_collateralAddress).safeTransferFrom(msg.sender, address(this), _value);
        }

        Auction storage auction = auctions[auctionCount];
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
        auction.bidEnd = block.number.add(_bidDuration);
        auction.revealEnd = auction.bidEnd.add(_revealDuration);
        auction.claimEnd = auction.revealEnd.add(_claimDuration);
        auction.challengeEnd = auction.claimEnd.add(_challengeDuration);
        auction.finalizeEnd = auction.challengeEnd.add(_finalizeDuration);

        uint borrowFee = polc.calculateBorrowFee(auction.tokenAddress, _value, _duration);
        celerToken.safeTransferFrom(msg.sender, address(polc), borrowFee);
        emit NewAuction(auctionCount, auction.asker);
        auctionCount = auctionCount.add(1);
    }

    /**
     * @notice Bid for an auction during bidding period. If called more than once,
     * it will update existing bid for the sender. However, when the bid is updated,
     * previous celer value will be forfeited
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
        Auction storage auction = auctions[_auctionId];
        require(block.number <= auction.bidEnd, "must be within bid duration");

        Bid storage bid = bidsByUser[msg.sender][_auctionId];

        if (bid.hash == 0) {
            auction.bidders.push(msg.sender);
            emit NewBid(_auctionId, msg.sender);
        } else {
            emit UpdateBid(_auctionId, msg.sender);
        }

        bid.hash = _hash;
        bid.celerValue = _celerValue;
        // Previous celer token will be forfeited if update bid
        celerToken.safeTransferFrom(msg.sender, address(this), _celerValue);
    }

    /**
     * @notice Reveal the bid of current user for an auction during revealing period.
     * It will calculate hash based on rate, value, celerValue and salt,
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
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.bidEnd, "must be within reveal duration");
        require(block.number <= auction.revealEnd, "must be within reveal duration");
        require(_rate <= auction.maxRate, "rate must be smaller than maxRate");
        require(_value >= auction.minValue, "value must be larger than minValue");

        Bid storage bid = bidsByUser[msg.sender][_auctionId];
        bytes32 hash = keccak256(abi.encodePacked(_rate, _value, _celerValue, _salt));
        require(hash == bid.hash, "hash must be same as the bid hash");
        require(_celerValue.mul(1 ether) >= _value, "celer value must be larger than value");

        uint celerRefund = bid.celerValue.sub(_celerValue);
        bid.celerValue = _celerValue;
        if (celerRefund > 0) {
            celerToken.safeTransfer(msg.sender, celerRefund);
        }

        address tokenAddress;
        uint availableValue;
        (tokenAddress, availableValue) = polc.getCommitmentAvailableValue(msg.sender, _commitmentId);
        require(tokenAddress == auction.tokenAddress, "tokenAddress of commitment must match tokenAddress of auction");
        require(availableValue >= _value, "must have enough value in commitment");

        bid.commitmentId = _commitmentId;
        bid.rate = _rate;
        bid.value = _value;
        bid.hash = bytes32(0);

        emit RevealBid(_auctionId, msg.sender);
    }

    /**
     * @notice The auction asker claims winners for the auction during claim period
     * @param _auctionId Id of the auction
     * @param _winners A list of winner addresses
     */
    function claimWinners(
        uint _auctionId,
        address[] calldata _winners
    )
        external
        whenNotPaused
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.revealEnd, "must be within claim duration");
        require(block.number <= auction.claimEnd, "must be within claim duration");
        require(msg.sender == auction.asker, "sender must be the auction asker");

        auction.winners = _winners;
        emit ClaimWinners(_auctionId, _winners);
    }

    /**
     * @notice A potential winner, who is not claimed as one of winners,
     * is able to challenge the auction during challenge period
     * @param _auctionId Id of the auction
     * @param _winners A list of winner addresses
     */
    function challengeWinners(
        uint _auctionId,
        address[] calldata _winners
    )
        external
        whenNotPaused
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.claimEnd, "must be within challenge");
        require(block.number <= auction.challengeEnd, "must be within challenge duration");
        require(_validateChallenger(_auctionId, msg.sender), "must be a valid challenger");

        auction.winners = _winners;
        auction.challengeEnd = auction.challengeEnd.add(auction.challengeDuration);
        auction.finalizeEnd = auction.challengeEnd.add(auction.finalizeDuration);

        emit ChallengeWinners(_auctionId, msg.sender, _winners);
    }

    /**
     * @notice Finalize the auction by withdrawing money from PoLC commiments during finalize period
     * @param _auctionId Id of the auction
     */
    function finalizeAuction(uint _auctionId) external whenNotPaused {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.challengeEnd,  "must be within finalize duration");
        require(block.number <= auction.finalizeEnd,  "must be within finalize duration");
        require(!auction.finalized, "auction must not be finalized");

        auction.finalized = true;
        address[] storage winners = auction.winners;
        uint value = auction.value;
        for (uint i = 0; i < winners.length && value > 0; i++) {
            address winner = winners[i];
            Bid storage winnerBid = bidsByUser[winner][_auctionId];

            if (value > winnerBid.value) {
                value = value.sub(winnerBid.value);
            } else {
                winnerBid.value = value;
                value = 0;
            }
            polc.lendCommitment(
                winner,
                winnerBid.commitmentId,
                winnerBid.value,
                auction.asker
            );
        }
        emit FinalizeAuction(_auctionId);
    }

    /**
     * @notice Repay the auction with original assets and interests after lending ends
     * It will send collateral back to asker if there is any
     * @param _auctionId Id of the auction
     */
    function repayAuction(uint _auctionId) external payable whenNotPaused {
        Auction storage auction = auctions[_auctionId];
        require(block.number <= auction.finalizeEnd + auction.duration,  "must be within auction lending duration");
        require(auction.finalized, "auction must be finalized");

        bool isEth = auction.tokenAddress == address(0);
        IERC20 token = IERC20(auction.tokenAddress);
        uint value = msg.value;

        address[] storage winners = auction.winners;
        for (uint i = 0; i < winners.length; i++) {
            address winner = winners[i];
            Bid storage winnerBid = bidsByUser[winner][_auctionId];
            uint bidValue = winnerBid.value;
            uint interest = bidValue.mul(winnerBid.rate).div(100);
            winnerBid.value = 0;

            if (isEth) {
                value = value.sub(bidValue).sub(interest);
                polc.repayCommitment.value(bidValue)(winner, winnerBid.commitmentId, bidValue);
                _asyncTransfer(winner, interest);
            } else {
                token.safeTransferFrom(msg.sender, winner, interest);
                polc.repayCommitment(winner, winnerBid.commitmentId, bidValue);
            }
        }

        _transfer(auction.collateralAddress, auction.asker, auction.collateraValue);
        emit RepayAuction(_auctionId);
    }

    /**
     * @notice Finalize the bid for bidders, who are not selected as winners,
     * or the asker fails to finalize the auction before finalizeEnd period
     * @param _auctionId Id of the auction
     */
    function finalizeBid(uint _auctionId) external whenNotPaused {
        bool allowWithdraw = false;
        Auction storage auction = auctions[_auctionId];

        if (auction.finalized) {
            allowWithdraw = !_checkWinner(_auctionId, msg.sender);
        } else {
            allowWithdraw = block.number > auction.finalizeEnd;
        }
        require(allowWithdraw, "you are not allowed to withdraw currently");

        Bid storage bid = bidsByUser[msg.sender][_auctionId];
        require(bid.celerValue > 0, "you do not have valid bid");

        uint celerValue = bid.celerValue;
        bid.celerValue = 0;
        bid.rate = 0;
        bid.value = 0;
        celerToken.safeTransferFrom(address(this), msg.sender, celerValue);
    }

    /**
     * @notice Collect the collateral of the auction if lending is not repaid
     * @param _auctionId Id of the auction
     */
    function collectCollateral(uint _auctionId) external whenNotPaused {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.finalizeEnd + auction.duration,  "must pass auction lending duration");
        require(_checkWinner(_auctionId, msg.sender), "sender must be a winner");

        Bid storage winnerBid = bidsByUser[msg.sender][_auctionId];
        require(winnerBid.value > 0, "bid value must be larger than zero");

        uint collateralReward = auction.collateraValue.mul(winnerBid.value).div(auction.value);
        winnerBid.value = 0;
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
            uint value,
            uint duration,
            uint maxRate,
            uint minValue,
            uint bidEnd,
            uint revealEnd,
            uint claimEnd,
            uint challengeEnd,
            uint finalizeEnd
        )
    {
        Auction storage auction = auctions[_auctionId];

        asker = auction.asker;
        value = auction.value;
        duration = auction.duration;
        maxRate = auction.maxRate;
        minValue = auction.minValue;
        bidEnd = auction.bidEnd;
        revealEnd = auction.revealEnd;
        claimEnd = auction.claimEnd;
        challengeEnd = auction.challengeEnd;
        finalizeEnd = auction.finalizeEnd;
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
        private
        view
        returns(bool)
    {
        Bid storage challengerBid = bidsByUser[_challenger][_auctionId];
        require(challengerBid.value > 0, "must be valid bid");

        Auction storage auction = auctions[_auctionId];
        address[] storage winners = auction.winners;
        bool isHigherRank = false;
        uint totalValue = 0;

        for (uint i = 0; i < winners.length; i++) {
            address winner = winners[i];
            Bid storage winnerBid = bidsByUser[winner][_auctionId];

            if (totalValue >= auction.value && i < winners.length) {
                return true;
            }
            totalValue = totalValue.add(winnerBid.value);

            if (winner == _challenger) {
                return false;
            }

            if (!isHigherRank) {
                if (_hasHigherRank(challengerBid, winnerBid)) {
                    isHigherRank = true;
                }
            }
        }

        return isHigherRank;
    }

    /**
     * @notice Compare bids of corresponding bidders, return true if bidder0 has higher rank
     * @param _bid0  A bid
     * @param _bid1 A bid
     */
    function _hasHigherRank(
        Bid storage _bid0,
        Bid storage _bid1
    )
        private
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

    /**
     * @notice Check if the bidder is winner
     * @param _auctionId Id of the auction
     * @param _bidder a bidder address
     */
    function _checkWinner(
        uint _auctionId,
        address _bidder
    )
        private
        view
        returns(bool)
    {
        Auction storage auction = auctions[_auctionId];
        address[] storage winners = auction.winners;

        for (uint i = 0; i < winners.length; i++) {
            if (winners[i] == _bidder) {
                return true;
            }
        }

        return false;
    }
}
