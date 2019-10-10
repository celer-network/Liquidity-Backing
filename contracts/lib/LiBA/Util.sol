pragma solidity ^0.5.0;

import "./Struct.sol";
import "../IPoLC.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

library LiBAUtil {
    using SafeMath for uint;

    /**
     * @notice Check if the address is in the winners list
     * @param _winners a list of winners
     * @param _addr an address
     */
    function _checkWinner(
        address[] memory _winners,
        address _addr
    )
        internal
        pure
        returns(bool)
    {
        for (uint i = 0; i < _winners.length; i++) {
            if (_winners[i] == _addr) {
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
        IPoLC _polc,
        address _tokenAddress,
        address _user,
        uint _commitmentId,
        uint _value
    )
        internal
    {
        bool isEth = _tokenAddress == address(0);

        if (isEth) {
            _polc.repayCommitment.value(_value)(_user, _commitmentId, address(this), _value);
        } else {
            IERC20(_tokenAddress).approve(address(_polc), _value);
            _polc.repayCommitment(_user, _commitmentId, address(this), _value);
        }
    }
}
