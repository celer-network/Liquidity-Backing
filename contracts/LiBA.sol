pragma solidity ^0.5.0;

import "./lib/IPoLC.sol";
import "./lib/TokenUtil.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/payment/PullPayment.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

/**
 * @title LiBA
 * @notice Contract allows service providers to send assets stored in PoLC through auction.
 */
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
    event NewBid(uint auctionId, address indexed bidder);
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

    function() external payable { }

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
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.bidEnd, "must be within reveal duration");
        require(block.number <= auction.revealEnd, "must be within reveal duration");
        require(_rate <= auction.maxRate, "rate must be smaller than maxRate");
        require(_value >= auction.minValue, "value must be larger than minValue");

        Bid storage bid = bidsByUser[msg.sender][_auctionId];
        bytes32 hash = keccak256(abi.encodePacked(_rate, _value, _celerValue, _salt));
        require(hash == bid.hash, "hash must be same as the bid hash");

        uint celerRefund = bid.celerValue.sub(_celerValue);
        bid.celerValue = _celerValue;
        if (celerRefund > 0) {
            celerToken.safeTransfer(msg.sender, celerRefund);
        }

        bid.commitmentId = _commitmentId;
        bid.rate = _rate;
        bid.value = _value;
        bid.hash = bytes32(0);
        polc.lendCommitment(msg.sender, _commitmentId, auction.tokenAddress, _value);

        emit RevealBid(_auctionId, msg.sender);
    }

    /**
     * @notice The auction asker claims winners for the auction during the claim period
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
     * @notice A potential winner, who is not claimed as one of the winners,
     * is able to challenge the auction during the challenge period
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
     * @notice Finalize the auction by withdrawing money from PoLC commitments during finalize period
     * @param _auctionId Id of the auction
     */
    function finalizeAuction(uint _auctionId) external whenNotPaused {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.challengeEnd,  "must be within finalize duration");
        require(block.number <= auction.finalizeEnd,  "must be within finalize duration");
        require(!auction.finalized, "auction must not be finalized");

        auction.finalized = true;
        address[] storage winners = auction.winners;
        uint value = 0;

        uint i = 0;
        // calculating the exact auction value from winner bids
        for (; i < winners.length; i++) {
            address winner = winners[i];
            Bid storage winnerBid = bidsByUser[winner][_auctionId];
            value = value.add(winnerBid.value);

            if (value > auction.value) {
                uint repayValue = value.sub(auction.value);
                _repayCommitment(auction.tokenAddress, winner, winnerBid.commitmentId, repayValue);
                winnerBid.value = winnerBid.value.sub(repayValue);
                value = auction.value;
                break;
            }
        }

        // return rest of winners fund
        for (; i < winners.length; i++) {
            address winner = winners[i];
            Bid storage winnerBid = bidsByUser[winner][_auctionId];
            _repayCommitment(auction.tokenAddress, winner, winnerBid.commitmentId, winnerBid.value);
            celerToken.safeTransfer(winner, winnerBid.celerValue);
            winnerBid.celerValue = 0;
            winnerBid.rate = 0;
            winnerBid.value = 0;
        }

        uint borrowFee = polc.calculateAuctionFee(auction.tokenAddress, value, auction.duration);
        celerToken.safeTransferFrom(msg.sender, address(polc), borrowFee);
        _transfer(auction.tokenAddress, auction.asker, value);

        emit FinalizeAuction(_auctionId);
    }

    /**
     * @notice Finalize the bid for bidders, who are not selected as winners,
     * or the asker fails to finalize the auction before finalize period
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
        require(bid.value > 0, "you do not have valid bid");

        _repayCommitment(auction.tokenAddress, msg.sender, bid.commitmentId, bid.value);
        celerToken.safeTransfer(msg.sender, bid.celerValue);
        bid.celerValue = 0;
        bid.rate = 0;
        bid.value = 0;
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
                polc.repayCommitment(winner, winnerBid.commitmentId, bidValue);
                token.safeTransferFrom(msg.sender, winner, interest);
            }
        }

        if (auction.collateraValue > 0) {
            _transfer(auction.collateralAddress, auction.asker, auction.collateraValue);
        }
        emit RepayAuction(_auctionId);
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
            address tokenAddress,
            address collateralAddress,
            uint collateraValue,
            uint value,
            uint duration,
            uint maxRate,
            uint minValue
        )
    {
        Auction storage auction = auctions[_auctionId];

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
        Auction storage auction = auctions[_auctionId];

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
     * @notice Compare bids of corresponding bidders, return true if bidder0 has a higher rank
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

    /**
     * @notice Helper function to repay the fund in commitment
     * @param _tokenAddress Token address
     * @param _user Owner of the commitment
     * @param _commitmentId Commitment ID
     * @param _value Value to repay
     */
    function _repayCommitment(
        address _tokenAddress,
        address _user,
        uint _commitmentId,
        uint _value
    )
        private
    {
        bool isEth = _tokenAddress == address(0);

        if (isEth) {
            polc.repayCommitment.value(_value)(_user, _commitmentId, _value);
        } else {
            polc.repayCommitment(_user, _commitmentId, _value);
        }
    }
}
