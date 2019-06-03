pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/utils/Address.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract TokenUtil is Ownable {
    using Address for address;
    using SafeERC20 for IERC20;

    mapping(address => bool) public supportedTokens;

    event UpdateSupportedToken(address indexed tokenAddress, bool supported);

   /**
     * @notice Validate if the token address and amount is valid
     * @param _tokenAddress the token address
     * @param _amount the amount to be transferred
     */
    modifier validateToken(address _tokenAddress, uint _amount) {
        require(supportedTokens[_tokenAddress], "token address must be supported");

        if (_tokenAddress == address(0)) {
            require(_amount == 0, "amount must be zero");
        } else {
            require(msg.value == 0, "msg value must be zero");
        }

        _;
    }

    /**
     * @notice Update a token in supported list
     * @param _tokenAddress the token address
     * @param _supported if the token is supported
     */
    function updateSupportedToken(address _tokenAddress, bool _supported) public onlyOwner {
        require(_tokenAddress.isContract(), "token address must be contract address");
        supportedTokens[_tokenAddress] = _supported;
        emit UpdateSupportedToken(_tokenAddress, _supported);
    }

    /**
     * @notice Internally uniform function to transfer contract's funds out
     * @param _tokenAddress the token address
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
