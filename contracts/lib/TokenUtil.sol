pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/utils/Address.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

/**
 * @title TokenUtil
 * @notice Abstract contract handles basic token related operation.
 */
contract TokenUtil is Ownable, Pausable {
    using Address for address;
    using SafeERC20 for IERC20;

    mapping(address => bool) public supportedTokens;

    event UpdateSupportedToken(address indexed tokenAddress, bool supported);
    event DrainToken(address tokenAddress, uint amount);

   /**
     * @notice Validate if the token address and amount is valid
     * @param _tokenAddress the token address
     * @param _value the amount to be transferred
     */
    modifier validateToken(address _tokenAddress, uint _value) {
        require(supportedTokens[_tokenAddress], "token address must be supported");

        if (_tokenAddress == address(0)) {
            require(_value == msg.value, "value must be equal msg value");
        } else {
            require(msg.value == 0, "msg value must be zero");
        }

        _;
    }

    /**
     * @notice Update a token in the supported list
     * @param _tokenAddress Token address
     * @param _supported If the token is supported
     */
    function updateSupportedToken(address _tokenAddress, bool _supported) public onlyOwner {
        require(_tokenAddress.isContract(), "token address must be contract address");
        supportedTokens[_tokenAddress] = _supported;
        emit UpdateSupportedToken(_tokenAddress, _supported);
    }

    /**
     * @notice Internal uniform function to transfer contract's funds out
     * @param _tokenAddress Token address
     * @param _to Address to transfer to
     * @param _amount Amount to be transferred
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

    /**
     * @notice Onwer drains one type of tokens when the contract is paused
     * @dev This is for emergency situations.
     * @param _tokenAddress address of token to drain
     * @param _amount drained token amount
     */
    function drainToken(
        address _tokenAddress,
        uint _amount
    )
        external
        whenPaused
        onlyOwner
    {
        _transfer(_tokenAddress, msg.sender, _amount);
        emit DrainToken(_tokenAddress, _amount);
    }
}
