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
        mapping(address => Bid) bids;
        address[] bidders;
        address[] winners;
        address challenger;
        uint bidEnd;
        uint revealEnd;
        uint claimEnd;
        uint challengeEnd;
        uint challengeDuration;
        uint value;
        uint duration;
        uint maxRate;
        uint minValue;
        uint maxBidRate;
        uint maxBidFactor;
    }

    address private celerTokenAddress;
    mapping(uint => Auction) private auctions;
    uint private auctionLength;
    uint private auctionDeposit;

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
        uint _value,
        uint _duration,
        uint _maxRate,
        uint _minValue
    )
        public
    {
        Auction auction = auctions[auctionLength];
        auction.asker = msg.sender;
        auction.bidEnd = block.number.add(_bidDuration);
        auction.revealEnd = auction.bidEnd.add(_revealDuration);
        auction.claimEnd = auction.revealEnd.add(_claimDuration);
        auction.challengeEnd = auction.claimEnd.add(_challengeDuration);
        auction.value = _value;
        auction.duration = _duration;
        auction.maxRate = _maxRate;
        auction.minValue = _minValue;

        ERC20(celerTokenAddress).safeTransferFrom(msg.sender, address(this), auctionDeposit);
        NewAuction(auctionLength);

        auctionLength += 1;
    }

    /**
     * @dev Bid for an auction
     * @param _auctionId Id of the acution
     * @param _hash hash based on desired rate, value, celerValue and salt
     * @param _celerValue potential celer value for bidding, it can be larger than actual celer value
     */
    function bid(
        uint _auctionId,
        bytes32 _hash,
        uint _celerValue
    )
        public
    {
        Auction auction = auctions[_auctionId];
        require(block.number <= auction.bidEnd);

        Bid bid = auction.bids[msg.sender];

        if (bid.hash == 0) {
            auction.bidders.push(msg.sender);
            NewBid(_auctionId, msg.sender);
        } else {
            UpdateBid(_auctionId, msg.sender);
        }

        bid.hash = _hash;
        bid.celerValue = _celerValue;
        ERC20(celerTokenAddress).safeTransferFrom(msg.sender, address(this), _celerValue);
    }

    // TODO: verify _commitmentsIds having enough fund
    /**
     * @dev Reveal the bid of current user for an auction
     * @param _auctionId Id of the acution
     * @param _rate interest rate for bidding
     * @param _value value for bidding
     * @param _celerValue celer value for bidding
     * @param _salt a random value used for hash
     * @param _commitmentsIds a list of commitments Id for bidding
     */
    function reveal(
        uint _auctionId,
        uint _rate,
        uint _value,
        uint _celerValue,
        uint _salt,
        uint[] _commitmentsIds
    )
        public
    {
        Auction auction = auctions[_auctionId];
        require(block.number > auction.bidEnd);
        require(block.number <= auction.revealEnd);
        require(_rate <= auction.maxRate);
        require(_value >= auction.minValue);

        Bid bid = auction.bids[msg.sender];
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

        if (_rate > auction.maxBidRate) {
            auction.maxBidRate = _rate;
        }

        uint factor = _celerValue.div(_value);
        if (factor > auction.maxBidFactor) {
            auction.maxBidFactor = factor;
        }

        RevealBid(_auctionId, msg.sender);
    }

    /**
     * @dev The auction asker claims winners for the auction
     * @param _auctionId Id of the acution
     * @param _winners a list of winner addresses
     */
    function claimWinners(
        uint _auctionId,
        address[] _winners
    )
        public
    {
        Auction auction = auctions[_auctionId];
        require(block.number > auction.revealEnd);
        require(block.number <= auction.claimEnd);
        require(msg.sender == auction.asker);

        auction.winners = _winners;
        ClaimWinners(_auctionId);
    }


    /**
     * @dev A potential winner, who is not claimed as one of winners, is able to challenge the auction
     * @param _auctionId Id of the acution
     * @param _winners a list of winner addresses
     */
    function challengeWinners(
        uint _auctionId,
        address[] _winners
    )
        public
    {
        Auction auction = auctions[_auctionId];
        require(block.number > auction.claimEnd);
        require(block.number <= auction.challengeEnd);
        require(_validateChallenger(auction, msg.sender));

        auction.winners = _winners;
        auction.challengeEnd = auction.challengeEnd.add(auction.challengeDuration);
        auction.challenger = msg.sender;

        ChallengeWinners(_auctionId);
    }

    /**
     * @dev validate if challenger is valid one
     * @param _auction acution instance
     * @param _challenger address for challenger, who may have higher score than current winners
     */
    function _validateChallenger(
        Auction storage _auction,
        address _challenger
    )
        private
        returns(bool)
    {
        bool exist = false;
        bool higherScore = false;
        address[] winners = _auction.winners;
        uint challengerScore = _calculateScore(_auction, _challenger);

        for (uint i = 0; i < winners.length; i++) {
            address winner = winners[i];
            if (winner == _challenger) {
                exist = true;
                break;
            }

            if (!higherScore) {
                uint winnerScore = _calculateScore(_auction, winner);

                if (challengerScore > winnerScore) {
                    higherScore = true;
                }
            }
        }

        return !exist && higherScore;
    }

    /**
     * @dev calcuate ranking score
     * @param _auction acution instance
     * @param _bidder a bidder address
     */
    function _calculateScore(
        Auction storage _auction,
        address _bidder
    )
        private
        returns(uint)
    {
        Bid bid = _auction.bids[_bidder];
        return bid._celerValue.div(bid._value).div(_auction.maxBidFactor) - bid._rate.div(_auction.maxBidRate);
    }
}
