pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract PoLC {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    struct Commitment {
        uint lockStart;
        uint lockEnd;
        uint lockedValue;
        uint availableValue;
        uint lendingValue;
        uint withdrawedReward;
    }

    address private celerTokenAddress;
    // reward payout for each block
    uint private blockReward;
    // mapping mining power by day
    mapping(uint => uint) private powerByTime;
    // mapping user address to its commitments
    mapping(
        address => mapping (uint => Commitment)
    ) public commitmentsByUser;

    constructor(address _celerTokenAddress, uint _blockReward) public {
        celerTokenAddress = _celerTokenAddress;
        blockReward = _blockReward;
    }

    event NewCommitment(uint commitmentId, address indexed user);
    event WithdrawFund(uint commitmentId);
    event WithdrawReward(uint commitmentId);

    /**
     * @dev check if the commitment lock has expired
     * @param _commitmentId ID of the commitment
     */
    modifier lockExpired(uint _commitmentId) {
        Commitment memory commitment = commitmentsByUser[msg.sender][_commitmentId];
        require(
            commitment.lockEnd != 0,
            "commitment must exist"
        );
        require(
            commitment.lockEnd < block.timestamp.div(1 days),
            "commitment lock must expire"
        );
        _;
    }

   /**
     * @dev Lock fund into the PoLC contract
     * @param _duration lock-in duration by days
     */
    function commitFund(uint _duration) public payable {
        require(
            msg.value > 0,
            "must send the transcation with eth value"
        );
        require(
            _duration > 0 && _duration < 365,
            "duration must fall into the 0-365 range"
        );

        Commitment storage commitment = commitmentsByUser[msg.sender][block.timestamp];
        require(
            commitment.lockEnd == 0,
            "one timestamp can only have one commitment"
        );

        uint lockStart = block.timestamp.div(1 days).add(1);
        uint lockEnd = lockStart.add(_duration);
        commitment.lockStart = lockStart;
        commitment.lockEnd = lockEnd;
        commitment.lockedValue = msg.value;
        commitment.availableValue = msg.value;

        uint power = msg.value.mul(_duration);
        for (uint i = lockStart; i < lockEnd; i++) {
            powerByTime[i] = powerByTime[i].add(power);
        }

        emit NewCommitment(block.timestamp, msg.sender);
    }

  /**
     * @dev withdraw all available fund in a commitment
     * @param _commitmentId ID of the commitment
     */
    function withdrawFund(
        uint _commitmentId
    )
        public
        lockExpired(_commitmentId)
    {
        Commitment storage commitment = commitmentsByUser[msg.sender][_commitmentId];
        uint availableValue = commitment.availableValue;
        commitment.availableValue = 0;
        msg.sender.transfer(availableValue);

        emit WithdrawFund(_commitmentId);
    }

  /**
     * @dev withdraw all available reward in a commitment
     * @param _commitmentId ID of the commitment
     */
    function withdrawReward(
        uint _commitmentId
    )
        public
        lockExpired(_commitmentId)
    {
        Commitment storage commitment = commitmentsByUser[msg.sender][_commitmentId];
        uint totalReward = 0;
        uint power = commitment.lockedValue.mul(
            commitment.lockEnd.sub(commitment.lockStart)
        );
        for (uint i = commitment.lockStart; i < commitment.lockEnd; i++) {
            totalReward = totalReward.add(
                blockReward.mul(power).div(powerByTime[i])
            );
        }

        commitment.withdrawedReward = totalReward;
        ERC20(celerTokenAddress).safeTransfer(msg.sender, totalReward);
        emit WithdrawReward(_commitmentId);
    }
}
