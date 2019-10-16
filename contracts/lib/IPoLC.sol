pragma solidity ^0.5.1;

contract IPoLC {
    function calculateAuctionFee(address _tokenAddress, uint _value, uint _duration) external view returns (uint);
    function lendCommitment(address _user, uint _commitmentId, address _tokenAddress, uint _value) external;
    function repayCommitment(address _user, uint _commitmentId, address _borrower, uint _value) external payable;
    function calculateReward(address _user, uint _commitmentId) public returns (uint);
}
