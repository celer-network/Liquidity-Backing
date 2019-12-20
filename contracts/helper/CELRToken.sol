pragma solidity ^0.5.1;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract CELRToken is ERC20 {
    string public name = "CELRToken";
    string public symbol = "CELR";
    uint8 public decimals = 18;
    uint public INITIAL_SUPPLY = 1000000000 ether;

    constructor() public {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
