pragma solidity ^0.5.0;

contract IPoLC {
    function getCommitmentAvailableValue(address _user, uint _commitmentId) external view returns (address, uint);
    function calculateAuctionFee(address _tokenAddress, uint _value, uint _duration) external view returns (uint);
    function lendCommitment(address _user, uint _commitmentId, uint _value, address payable _borrower) external;
    function repayCommitment(address _user, uint _commitmentId, uint _value) external payable;
}
