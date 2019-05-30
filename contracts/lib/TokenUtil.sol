pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/utils/Address.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract TokenUtil {
    using Address for address;
    using SafeERC20 for IERC20;

    modifier validateToken(address _tokenAddress, uint _amount) {
        if (_tokenAddress == address(0)) {
            require(msg.value > 0, "msg value must be large than zero");
            require(_amount == 0, "amount must be zero");
        } else {
            require(_tokenAddress.isContract(), "token address must be contract address");
            require(msg.value == 0, "msg value must be zero");
            require(_amount > 0, "amount must be larger than zero");
        }

        _;
    }

    /**
     * @notice Internally uniform function to transfer contract's funds out
     * @param _to the address to transfer to
     * @param _amount the amount to be transferred
     */
    function _transfer(address _tokenAddress, address payable _to, uint _amount) internal {
        require(_to != address(0), "transfer to address must not be zero");
        if (_amount == 0) { return; }

        if (_tokenAddress == address(0)) {
            _to.transfer(_amount);
        } else {
            IERC20(_tokenAddress).safeTransfer(_to, _amount);
        }
    }
}
