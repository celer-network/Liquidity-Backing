pragma solidity ^0.5.0;

contract PoLCInterface {
    struct Commitment {
        uint lockStart;
        uint lockEnd;
        uint lockedValue;
        uint availableValue;
        uint lendingValue;
        uint withdrawedReward;
    }

    mapping(
        address => mapping (uint => Commitment)
    ) public commitmentsByUser;
}