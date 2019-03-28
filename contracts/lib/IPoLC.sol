pragma solidity ^0.5.0;

contract IPoLC {
    function getCommitmentAvailableValue(address _user, uint _commitmentId) external view returns (uint);
    function lendCommitment(address _user, uint _commitmentId, uint _value, address _borrower) external;
    function repayCommitment(address _user, uint _commitmentId) external payable;
}
