pragma solidity ^0.5.0;

import "./lib/IPoLC.sol";
import "./lib/TokenUtil.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/payment/PullPayment.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";

contract LiBA is TokenUtil, PullPayment, WhitelistedRole {
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
        uint maxBidRate;
        uint maxBidFactor;
        bool finalized;
        address[] bidders;
        address[] winners;
        address challenger;
        uint challengeDuration;
        uint finalizeDuration;
        uint bidEnd;
        uint revealEnd;
        uint claimEnd;
        uint challengeEnd;
        uint finalizeEnd;
    }

    IPoLC private polc;
    uint private auctionDeposit;
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

    constructor(address _celerTokenAddress, address _polcAddress, uint _auctionDeposit, bool _enableWhitelist) public {
        celerToken = IERC20(_celerTokenAddress);
        polc = IPoLC(_polcAddress);
        auctionDeposit = _auctionDeposit;
        enableWhitelist = _enableWhitelist;

        // Enable eth support by default
        supportedTokens[address(0)] = true;
    }

    /**
     * @notice Check if the sender is in whitelist
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
     * @param _tokenAddress token address for token to borrow
     * @param _bidDuration duration for bidding
     * @param _revealDuration duration for revealing
     * @param _claimDuration duration for claiming
     * @param _challengeDuration duration for challenging
     * @param _finalizeDuration duration for finalizing
     * @param _value total value asked
     * @param _duration duration for the lending
     * @param _maxRate maximum rate accepted
     * @param _minValue minimum value accepted per bid
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
        public
        payable
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

        celerToken.safeTransferFrom(msg.sender, address(this), auctionDeposit);
        emit NewAuction(auctionCount, auction.asker);
        auctionCount += 1;
    }

    /**
     * @notice Bid for an auction
     * @param _auctionId Id of the auction
     * @param _hash hash based on desired rate, value, celerValue and salt
     * @param _celerValue potential celer value for bidding, it can be larger than actual celer value
     */
    function placeBid(
        uint _auctionId,
        bytes32 _hash,
        uint _celerValue
    )
        external
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

    // TODO: verify _commitmentsIds having enough fund
    /**
     * @notice Reveal the bid of current user for an auction
     * @param _auctionId Id of the auction
     * @param _rate interest rate for bidding
     * @param _value value for bidding
     * @param _celerValue celer value for bidding
     * @param _salt a random value used for hash
     * @param _commitmentId commitment Id
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

        if (_rate > auction.maxBidRate) {
            auction.maxBidRate = _rate;
        }

        uint factor = _celerValue.mul(1 ether).div(_value);
        if (factor > auction.maxBidFactor) {
            auction.maxBidFactor = factor;
        }

        emit RevealBid(_auctionId, msg.sender);
    }

    /**
     * @notice The auction asker claims winners for the auction
     * @param _auctionId Id of the auction
     * @param _winners a list of winner addresses
     */
    function claimWinners(
        uint _auctionId,
        address[] calldata _winners
    )
        external
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.revealEnd, "must be within claim duration");
        require(block.number <= auction.claimEnd, "must be within claim duration");
        require(msg.sender == auction.asker, "sender must be the auction asker");

        auction.winners = _winners;
        emit ClaimWinners(_auctionId, _winners);
    }

    /**
     * @notice A potential winner, who is not claimed as one of winners, is able to challenge the auction
     * @param _auctionId Id of the auction
     * @param _winners a list of winner addresses
     */
    function challengeWinners(
        uint _auctionId,
        address[] calldata _winners
    )
        external
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.claimEnd, "must be within challenge");
        require(block.number <= auction.challengeEnd, "must be within challenge duration");
        require(_validateChallenger(_auctionId, msg.sender), "must be valid challenger");

        auction.winners = _winners;
        auction.challenger = msg.sender;
        auction.challengeEnd = auction.challengeEnd.add(auction.challengeDuration);
        auction.finalizeEnd = auction.challengeEnd.add(auction.finalizeDuration);

        emit ChallengeWinners(_auctionId, msg.sender, _winners);
    }

    /**
     * @notice Finalize the auction
     * @param _auctionId Id of the auction
     */
    function finalizeAuction(uint _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.challengeEnd,  "must be within finalize duration");
        require(block.number <= auction.finalizeEnd,  "must be within finalize duration");
        require(!auction.finalized, "auction must not be finalized");

        auction.finalized = true;
        // If there is no challenger, refund the deposit to asker
        if (auction.challenger == address(0)) {
            celerToken.safeTransfer(auction.asker, auctionDeposit);
        } else {
            celerToken.safeTransfer(auction.challenger, auctionDeposit);
        }

        address[] storage winners = auction.winners;
        for (uint i = 0; i < winners.length; i++) {
            address winner = winners[i];
            Bid storage winnerBid = bidsByUser[winner][_auctionId];
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
     * @notice Repay the auction
     * @param _auctionId Id of the auction
     */
    function repayAuction(uint _auctionId) external payable {
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
     * @notice Finalize the bid for the acution for bidders, who are not winning the auction,
     * or asker fails to finalize the auction before finalizeEnd
     * @param _auctionId Id of the auction
     */
    function finalizeBid(uint _auctionId) external {
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
     * @notice collect the collateral of the auction if it is not paid
     * @param _auctionId Id of the auction
     */
    function collectCollateral(uint _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.finalizeEnd + auction.duration,  "must be pass auction lending duration");
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
     * @param _challenger address for challenger, who may have higher score than current winners
     */
    function _validateChallenger(
        uint _auctionId,
        address _challenger
    )
        private
        view
        returns(bool)
    {
        bool exist = false;
        bool higherScore = false;
        Auction storage auction = auctions[_auctionId];
        address[] storage winners = auction.winners;
        uint challengerScore = _calculateScore(_auctionId, _challenger);

        for (uint i = 0; i < winners.length; i++) {
            address winner = winners[i];
            if (winner == _challenger) {
                exist = true;
                break;
            }

            if (!higherScore) {
                uint winnerScore = _calculateScore(_auctionId, winner);

                if (challengerScore > winnerScore) {
                    higherScore = true;
                }
            }
        }

        return !exist && higherScore;
    }

    /**
     * @notice Calcuate ranking score
     * @param _auctionId Id of the auction
     * @param _bidder a bidder address
     */
    function _calculateScore(
        uint _auctionId,
        address _bidder
    )
        private
        view
        returns(uint)
    {
        Auction storage auction = auctions[_auctionId];
        Bid storage bid = bidsByUser[_bidder][_auctionId];
        uint valueFactor = bid.celerValue.mul(1 ether).div(bid.value).div(auction.maxBidFactor);
        uint rateFactor = bid.rate.div(auction.maxBidRate);

        return valueFactor.sub(rateFactor);
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
