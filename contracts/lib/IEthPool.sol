pragma solidity ^0.5.0;

interface IEthPool {
    event Deposit(address recipient, uint value);
    event Withdraw(address account, uint value);
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);

    function deposit(address recipient) external payable;

    function withdraw(uint value) external;

    function approve(address spender, uint value) external returns (bool);

    function transferFrom(address from, address payable to, uint value) external returns (bool);

    function balanceOf(address who) external view returns (uint);

    function allowance(address owner, address spender) external view returns (uint);
}
