pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

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
    uint private auctionDeposit;
    uint private auctionLength;
    mapping(uint => Auction) private auctions;
    mapping(address => mapping(uint => Bid)) private bidsByUser;

    event NewAuction(uint auctionId);
    event NewBid(uint auctionId, address bidder);
    event UpdateBid(uint auctionId, address bidder);
    event RevealBid(uint auctionId, address bidder);
    event ClaimWinners(uint auctionId);
    event ChallengeWinners(uint auctionId);

    constructor(address _celerTokenAddress, uint _auctionDeposit) {
        celerTokenAddress = _celerTokenAddress;
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
        Auction storage auction = auctions[auctionLength];
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
        emit NewAuction(auctionLength);
        auctionLength += 1;
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
        require(block.number <= auction.bidEnd);

        Bid storage bid = bidsByUser[msg.sender][_auctionId];

        if (bid.hash == 0) {
            auction.bidders.push(msg.sender);
            emit NewBid(_auctionId, msg.sender);
        } else {
            emit UpdateBid(_auctionId, msg.sender);
        }

        bid.hash = _hash;
        bid.celerValue = _celerValue;
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
        uint[] _commitmentsIds
    )
        public
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.bidEnd);
        require(block.number <= auction.revealEnd);
        require(_rate <= auction.maxRate);
        require(_value >= auction.minValue);

        Bid storage bid = bidsByUser[msg.sender][_auctionId];
        bytes32 hash = keccak256(_rate, _value, _celerValue, _salt);
        require(hash == bid.hash);

        uint celerRefund = bid.celerValue.sub(_celerValue);
        if (celerRefund > 0) {
            ERC20(celerTokenAddress).safeTransferFrom(address(this), msg.sender, celerRefund);
        }

        bid.celerValue = _celerValue;
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
        address[] _winners
    )
        public
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.revealEnd);
        require(block.number <= auction.claimEnd);
        require(msg.sender == auction.asker);

        auction.winners = _winners;
        emit ClaimWinners(_auctionId);
    }

    /**
     * @dev A potential winner, who is not claimed as one of winners, is able to challenge the auction
     * @param _auctionId Id of the auction
     * @param _winners a list of winner addresses
     */
    function challengeWinners(
        uint _auctionId,
        address[] _winners
    )
        public
    {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.claimEnd);
        require(block.number <= auction.challengeEnd);
        require(_validateChallenger(_auctionId, msg.sender));

        auction.winners = _winners;
        auction.challenger = msg.sender;
        auction.challengeEnd = auction.challengeEnd.add(auction.challengeDuration);
        auction.finalizeEnd = auction.challengeEnd.add(auction.finalizeDuration);

        emit ChallengeWinners(_auctionId);
    }

    /**
     * @dev withdraw challenge reward for challenger
     * @param _auctionId Id of the auction
     */
    function withdrawChallengeReward(uint _auctionId) public {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.challengeEnd);
        require(msg.sender == auction.challenger);

        ERC20(celerTokenAddress).safeTransferFrom(address(this), auction.challenger, auctionDeposit);
    }

    // TODO: need to lock the fund in PoLC and issue new token
    /**
     * @dev finalize the auction
     * @param _auctionId Id of the auction
     */
    function finalizeAuction(uint _auctionId) public {
        Auction storage auction = auctions[_auctionId];
        require(block.number > auction.challengeEnd);
        require(block.number <= auction.finalizeEnd);
        require(!auction.finalized);

        // If there is no challenger, refund the deposit to asker
        if (auction.challenger == 0x0) {
            ERC20(celerTokenAddress).safeTransferFrom(address(this), auction.asker, auctionDeposit);
        }

        auction.finalized = true;
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
        view
        private
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
        view
        private
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
        view
        private
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
