pragma solidity ^0.5.0;

import "./PoLCInterface.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract LiBA {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    struct Bid {
        bytes32 hash;
        uint[] commitmentsIds;
        uint[] lendingValues;
        uint rate;
        uint value;
        uint celerValue;
    }

    struct Auction {
        address asker;
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

    address private celerTokenAddress;
    PoLCInterface private polc;
    uint private auctionDeposit;
    uint private auctionCount;
    mapping(uint => Auction) private auctions;
    mapping(address => mapping(uint => Bid)) public bidsByUser;

    event NewAuction(uint auctionId, address asker);
    event NewBid(uint auctionId, address bidder);
    event UpdateBid(uint auctionId, address bidder);
    event RevealBid(uint auctionId, address bidder);
    event ClaimWinners(uint auctionId, address[] winners);
    event ChallengeWinners(uint auctionId, address challenger, address[] winners);
    event FinalizeAuction(uint auctionId);

    constructor(address _celerTokenAddress, address _polcAddress, uint _auctionDeposit) public {
        celerTokenAddress = _celerTokenAddress;
        polc = PoLCInterface(_polcAddress);
        auctionDeposit = _auctionDeposit;
    }

    /**
     * @dev Launch a new auction
     * @param _bidDuration duration for bidding
     * @param _revealDuration duration for revealing
     * @param _claimDuration duration for claiming
     * @param _challengeDuration duration for challenging
     * @param _value total value asked
     * @param _duration duration for the lending
     * @param _maxRate maximum rate accepted
     * @param _minValue minimum value accepted per bid
     */
    function initAuction(
        uint _bidDuration,
        uint _revealDuration,
        uint _claimDuration,
        uint _challengeDuration,
        uint _finalizeDuration,
        uint _value,
        uint _duration,
        uint _maxRate,
        uint _minValue
    )
        public
    {
        Auction storage auction = auctions[auctionCount];
        auction.asker = msg.sender;
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

        ERC20(celerTokenAddress).safeTransferFrom(msg.sender, address(this), auctionDeposit);
        emit NewAuction(auctionCount, auction.asker);
        auctionCount += 1;
    }

    /**
     * @dev Get auction info
     * @param _auctionId Id of the auction
     */
    function getAuction(
        uint _auctionId
    )
        view
        public
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
     * @dev Bid for an auction
     * @param _auctionId Id of the auction
     * @param _hash hash based on desired rate, value, celerValue and salt
     * @param _celerValue potential celer value for bidding, it can be larger than actual celer value
     */
    function placeBid(
        uint _auctionId,
        bytes32 _hash,
        uint _celerValue
    )
        public
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
        ERC20(celerTokenAddress).safeTransferFrom(msg.sender, address(this), _celerValue);
    }

    // TODO: verify _commitmentsIds having enough fund
    /**
     * @dev Reveal the bid of current user for an auction
     * @param _auctionId Id of the auction
     * @param _rate interest rate for bidding
     * @param _value value for bidding
     * @param _celerValue celer value for bidding
     * @param _salt a random value used for hash
     * @param _commitmentsIds a list of commitments Id for bidding
     */
    function revealBid(
        uint _auctionId,
        uint _rate,
        uint _value,
        uint _celerValue,
        uint _salt,
        uint[] memory _commitmentsIds
    )
        public
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.bidEnd, "must be within reveal duration");
        require(block.number <= auction.revealEnd, "must be within reveal duration");
        require(_rate <= auction.maxRate, "rate must be smaller than maxRate");
        require(_value >= auction.minValue, "value must be larger than minValue");

        Bid storage bid = bidsByUser[msg.sender][_auctionId];
        bytes32 hash = keccak256(abi.encodePacked(_rate, _value, _celerValue, _salt));
        require(hash == bid.hash, "hash must be same as the bid hash");
        require(_celerValue > _value, "celer value must be larger than value");

        uint celerRefund = bid.celerValue.sub(_celerValue);
        bid.celerValue = _celerValue;
        if (celerRefund > 0) {
            ERC20(celerTokenAddress).safeTransfer(msg.sender, celerRefund);
        }

        uint totalAvailableValues = 0;
        for (uint i = 0; i < _commitmentsIds.length; i++) {
            (,,,uint availableValue,,) = polc.commitmentsByUser(msg.sender, _commitmentsIds[i]);
            totalAvailableValues += availableValue;
        }
        require(totalAvailableValues >= _value, "must have enough value in commitments");

        bid.commitmentsIds = _commitmentsIds;
        bid.rate = _rate;
        bid.value = _value;
        bid.hash = bytes32(0);

        if (_rate > auction.maxBidRate) {
            auction.maxBidRate = _rate;
        }

        uint factor = _celerValue.div(_value);
        if (factor > auction.maxBidFactor) {
            auction.maxBidFactor = factor;
        }

        emit RevealBid(_auctionId, msg.sender);
    }

    /**
     * @dev The auction asker claims winners for the auction
     * @param _auctionId Id of the auction
     * @param _winners a list of winner addresses
     */
    function claimWinners(
        uint _auctionId,
        address[] memory _winners
    )
        public
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.revealEnd, "must be within claim duration");
        require(block.number <= auction.claimEnd, "must be within claim duration");
        require(msg.sender == auction.asker, "sender must be the auction asker");

        auction.winners = _winners;
        emit ClaimWinners(_auctionId, _winners);
    }

    /**
     * @dev A potential winner, who is not claimed as one of winners, is able to challenge the auction
     * @param _auctionId Id of the auction
     * @param _winners a list of winner addresses
     */
    function challengeWinners(
        uint _auctionId,
        address[] memory _winners
    )
        public
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

    // TODO: need to lock the fund in PoLC and issue new token
    /**
     * @dev finalize the auction
     * @param _auctionId Id of the auction
     */
    function finalizeAuction(uint _auctionId) public {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.challengeEnd,  "must be within finalize duration");
        require(block.number <= auction.finalizeEnd,  "must be within finalize duration");
        require(!auction.finalized, "auction must not be finalized");

        auction.finalized = true;
        // If there is no challenger, refund the deposit to asker
        if (auction.challenger == address(0x0)) {
            ERC20(celerTokenAddress).safeTransfer(auction.asker, auctionDeposit);
        } else {
            ERC20(celerTokenAddress).safeTransfer(auction.challenger, auctionDeposit);
        }

        emit FinalizeAuction(_auctionId);
    }

    /**
     * @dev finalize the bid for the acution for bidders, who are not winning the auction,
     * or asker fails to finalize the auction before finalizeEnd
     * @param _auctionId Id of the auction
     */
    function finalizeBid(uint _auctionId) public {
        bool allowWithdraw = false;
        Auction storage auction = auctions[_auctionId];

        if (auction.finalized) {
            allowWithdraw = !_checkWinner(_auctionId, msg.sender);
        } else {
            allowWithdraw = block.number > auction.finalizeEnd;
        }
        require(allowWithdraw);

        Bid storage bid = bidsByUser[msg.sender][_auctionId];
        require(bid.celerValue > 0);

        uint celerValue = bid.celerValue;
        bid.celerValue = 0;
        bid.rate = 0;
        bid.value = 0;
        ERC20(celerTokenAddress).safeTransferFrom(address(this), msg.sender, celerValue);
    }

    /**
     * @dev validate if challenger is valid one
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
     * @dev calcuate ranking score
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
        uint valueFactor = bid.celerValue.div(bid.value).div(auction.maxBidFactor);
        uint rateFactor = bid.rate.div(auction.maxBidRate);

        return valueFactor.sub(rateFactor);
    }

    /**
     * @dev check if the bidder is winner
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
