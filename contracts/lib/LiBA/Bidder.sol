pragma solidity ^0.5.1;

import "./Struct.sol";
import "./Util.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

library LiBABidder {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    /**
     * @notice Bid for an auction during the bidding period. If called more than once,
     * it will update the existing bid for the sender. However, when the bid is updated,
     * the previous Celer value will be forfeited
     * @param _auction auction struct
     * @param _bid bid struct
     * @param _hash Hash calculated from desired rate, value, celerValue and salt
     * @param _celerValue Potential celer value for bidding, it can be larger than actual celer value
     */
    function placeBid(
        LiBAStruct.Auction storage _auction,
        LiBAStruct.Bid storage _bid,
        IERC20 _celerToken,
        bytes32 _hash,
        uint _celerValue
    )
        external
    {
        require(block.number <= _auction.bidEnd, "must be within bid duration");

        _bid.hash = _hash;
        _bid.celerValue = _celerValue;
        // Previous celer token will be forfeited if update bid
        _celerToken.safeTransferFrom(msg.sender, address(this), _celerValue);
    }

    /**
     * @notice Reveal the bid of current user for an auction during the revealing period.
     * It will calculate hash based on rate, value, celer value, and salt,
     * and check if it is same as the hash provided in the bidding period.
     * It will also check if commitment in PoLC has enough fund
     * @param _auction auction struct
     * @param _bid bid struct
     * @param _rate Interest rate for bidding
     * @param _value Value for bidding
     * @param _celerValue Celer value for bidding
     * @param _salt A random value used for hash
     * @param _commitmentId Commitment Id in PoLC belong to the sender
     */
    function revealBid(
        LiBAStruct.Auction storage _auction,
        LiBAStruct.Bid storage _bid,
        IPoLC _polc,
        IERC20 _celerToken,
        uint _rate,
        uint _value,
        uint _celerValue,
        uint _salt,
        uint _commitmentId
    )
        external
    {
        require(block.number > _auction.bidEnd, "must be after bid duration");
        require(block.number <= _auction.revealEnd, "must be within reveal duration");
        require(_rate <= _auction.maxRate, "rate must be smaller than maxRate");
        require(_value >= _auction.minValue, "value must be larger than minValue");

        bytes32 hash = keccak256(abi.encodePacked(_rate, _value, _celerValue, _salt));
        require(hash == _bid.hash, "hash must be same as the bid hash");

        uint celerRefund = _bid.celerValue.sub(_celerValue);
        _bid.celerValue = _celerValue;
        if (celerRefund > 0) {
            _celerToken.safeTransfer(msg.sender, celerRefund);
        }

        _bid.commitmentId = _commitmentId;
        _bid.rate = _rate;
        _bid.value = _value;
        _bid.hash = bytes32(0);
        _polc.lendCommitment(msg.sender, _commitmentId, _auction.tokenAddress, _value);
    }

    /**
     * @notice Finalize the bid for bidders, who are not selected as winners,
     * or the asker fails to finalize the auction before finalize period
     * @param _auction auction struct
     * @param _bid bid struct
     * @param _polc polc contract instance
     */
    function finalizeBid(
        LiBAStruct.Auction storage _auction,
        LiBAStruct.Bid storage _bid,
        IERC20 _celerToken,
        IPoLC _polc
    )
        external
    {
        bool allowWithdraw = false;

        if (_auction.finalized) {
            allowWithdraw = !LiBAUtil._checkWinner(_auction.winners, msg.sender);
        } else {
            allowWithdraw = block.number > _auction.finalizeEnd;
        }
        require(allowWithdraw, "you are not allowed to withdraw currently");
        require(_bid.value > 0, "you do not have valid bid");

        LiBAUtil._repayCommitment(_polc, _auction.tokenAddress, msg.sender, _bid.commitmentId, _bid.value);
        _celerToken.safeTransfer(msg.sender, _bid.celerValue);
        _bid.celerValue = 0;
        _bid.value = 0;
    }

    /**
     * @notice Collect the collateral of the auction if lending is not repaid
     * @param _auction auction struct
     * @param _bid bid struct
     */
    function collectCollateral(
        LiBAStruct.Auction storage _auction,
        LiBAStruct.Bid storage _bid
    )
        external
        returns (uint collateralReward)
    {
        require(_auction.finalized, "auction must be finalized");
        require(block.timestamp > _auction.lendingStart.add(_auction.duration.mul(1 days)),  "must pass auction lending duration");
        require(LiBAUtil._checkWinner(_auction.winners, msg.sender), "sender must be a winner");
        require(_bid.value > 0, "bid value must be larger than zero");

        collateralReward = _auction.collateraValue.mul(_bid.value).div(_auction.value);
        _bid.value = 0;
    }
}
