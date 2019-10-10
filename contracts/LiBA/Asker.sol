pragma solidity ^0.5.0;

import "./Struct.sol";
import "./Util.sol";
import "../lib/IPoLC.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

library LiBAAsker {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    /**
     * @notice The auction asker claims winners for the auction during the claim period
     * @param _auction auction struct
     * @param _winners A list of winner addresses
     */
    function claimWinners(
        LiBAStruct.Auction storage _auction,
        address[] calldata _winners
    )
        external
    {
        require(block.number > _auction.revealEnd, "must be within claim duration");
        require(block.number <= _auction.claimEnd, "must be within claim duration");
        require(msg.sender == _auction.asker, "sender must be the auction asker");

        _auction.winners = _winners;
    }

    /**
     * @notice Finalize the auction by withdrawing money from PoLC commitments during finalize period
     * @param _auction auction struct
     * @param _bidsByUser bidsByUser mapping
     * @param _polc polc contract
     * @param _celerToken celer token contract
     * @param _auctionId Id of the auction
     */
    function finalizeAuction(
        LiBAStruct.Auction storage _auction,
        mapping(address => mapping(uint => LiBAStruct.Bid)) storage _bidsByUser,
        IPoLC _polc,
        IERC20 _celerToken,
        uint _auctionId
    )
        external
    {
        require(block.number > _auction.challengeEnd,  "must be within finalize duration");
        require(block.number <= _auction.finalizeEnd,  "must be within finalize duration");
        require(!_auction.finalized, "auction must not be finalized");

        _auction.finalized = true;
        address[] storage winners = _auction.winners;
        uint value = 0;
        uint feeDeposit = 0;

        uint i = 0;
        // calculating the exact auction value from winner bids
        for (; i < winners.length; i++) {
            address winner = winners[i];
            LiBAStruct.Bid storage winnerBid = _bidsByUser[winner][_auctionId];
            value = value.add(winnerBid.value);
            feeDeposit = feeDeposit.add(_polc.calculateReward(winnerBid.commitmentId));

            if (value > _auction.value) {
                uint repayValue = value.sub(_auction.value);
                LiBAUtil._repayCommitment(_polc, _auction.tokenAddress, winner, winnerBid.commitmentId, repayValue);
                winnerBid.value = winnerBid.value.sub(repayValue);
                value = _auction.value;
                break;
            }
        }

        // return rest of winners fund
        for (; i < winners.length; i++) {
            address winner = winners[i];
            LiBAStruct.Bid storage winnerBid = _bidsByUser[winner][_auctionId];
            LiBAUtil._repayCommitment(_polc, _auction.tokenAddress, winner, winnerBid.commitmentId, winnerBid.value);
            _celerToken.safeTransfer(winner, winnerBid.celerValue);
            winnerBid.celerValue = 0;
            winnerBid.rate = 0;
            winnerBid.value = 0;
        }

        _auction.lendingStart = block.timestamp;
        _auction.feeDeposit = feeDeposit;
        _auction.value = value;
    }
}
