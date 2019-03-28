pragma solidity ^0.5.0;

import "./lib/IEthPool.sol";
import "./lib/IPoLC.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract PoLC is Ownable, IPoLC {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    struct Commitment {
        uint lockStart;
        uint lockEnd;
        uint lockedValue;
        uint availableValue;
        uint lendingValue;
        uint withdrawedReward;
    }

    address private libaAddress;
    IERC20 private celerToken;
    IEthPool private ethPool;
    // reward payout for each block
    uint private blockReward;
    // mapping mining power by day
    mapping(uint => uint) private powerByTime;
    // mapping user address to its commitments
    mapping(
        address => mapping (uint => Commitment)
    ) public commitmentsByUser;

    constructor(address _celerTokenAddress, uint _blockReward) public {
        celerToken = IERC20(_celerTokenAddress);
        blockReward = _blockReward;
    }

    event NewCommitment(uint commitmentId, address indexed user);
    event WithdrawFund(uint commitmentId);
    event WithdrawReward(uint commitmentId);

    /**
     * @notice Check if the commitment lock has expired
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
     * @notice Lock fund into the PoLC contract
     * @param _duration lock-in duration by days
     */
    function commitFund(uint _duration) external payable {
        require(
            _duration > 0 && _duration < 365,
            "duration must fall into the 0-365 range"
        );

        uint value = msg.value;
        address sender = msg.sender;
        uint currentTimestamp = block.timestamp;
        Commitment storage commitment = commitmentsByUser[sender][currentTimestamp];
        require(
            commitment.lockEnd == 0,
            "one timestamp can only have one commitment"
        );

        uint lockStart = currentTimestamp.div(1 days).add(1);
        uint lockEnd = lockStart.add(_duration);
        commitment.lockStart = lockStart;
        commitment.lockEnd = lockEnd;
        commitment.lockedValue = value;
        commitment.availableValue = value;

        uint power = value.mul(_duration);
        for (uint i = lockStart; i < lockEnd; i++) {
            powerByTime[i] = powerByTime[i].add(power);
        }

        emit NewCommitment(currentTimestamp, sender);
    }

    /**
     * @notice Withdraw all available fund in a commitment
     * @param _commitmentId ID of the commitment
     */
    function withdrawFund(
        uint _commitmentId
    )
        external
        lockExpired(_commitmentId)
    {
        Commitment storage commitment = commitmentsByUser[msg.sender][_commitmentId];
        uint availableValue = commitment.availableValue;
        commitment.availableValue = 0;
        msg.sender.transfer(availableValue);

        emit WithdrawFund(_commitmentId);
    }

    /**
     * @notice Withdraw all available reward in a commitment
     * @param _commitmentId ID of the commitment
     */
    function withdrawReward(
        uint _commitmentId
    )
        external
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
        celerToken.safeTransfer(msg.sender, totalReward);
        emit WithdrawReward(_commitmentId);
    }

    /**
     * @notice Set libaAddress state variable
     * @param _libaAddress Liba address
     */
    function setLibaAddress(address _libaAddress) external onlyOwner
    {
        require(libaAddress == address(0), "libaAddress can only be set once");
        libaAddress = _libaAddress;
    }

   /**
     * @notice Set eth pool address
     * @param _ethPoolAddress ethPool address
     */
    function setEthPool(address _ethPoolAddress) external onlyOwner
    {
        require(address(ethPool) == address(0), "ethPool can only be set once");
        ethPool = IEthPool(_ethPoolAddress);
    }

    /**
     * @notice Get available value for specific commitment of a user
     * @param _user User address
     * @param _commitmentId ID of the commitment
     */
    function getCommitmentAvailableValue(
        address _user,
        uint _commitmentId
    )
        external
        view
        returns (uint)
    {
        Commitment storage commitment = commitmentsByUser[_user][_commitmentId];
        return commitment.availableValue;
    }

    /**
     * @notice Lend borrower a specific value
     * @param _user User address
     * @param _commitmentId ID of the commitment
     * @param _value value to lend
     * @param _borrower borrower address
     */
    function lendCommitment(
        address _user,
        uint _commitmentId,
        uint _value,
        address _borrower
    )
        external
    {
        require(msg.sender == libaAddress, "sender must be liba contract");
        Commitment storage commitment = commitmentsByUser[_user][_commitmentId];
        require(_value <= commitment.availableValue, "value must be smaller than available value");

        commitment.availableValue = commitment.availableValue.sub(_value);
        commitment.lendingValue = commitment.lendingValue.add(_value);
        ethPool.deposit.value(_value)(_borrower);
    }

   /**
     * @notice Repay to the commitment
     * @param _user User address
     * @param _commitmentId ID of the commitment
     */
    function repayCommitment(
        address _user,
        uint _commitmentId
    )
        external
        payable
    {
        require(msg.sender == libaAddress, "sender must be liba contract");
        Commitment storage commitment = commitmentsByUser[_user][_commitmentId];

        commitment.lendingValue = commitment.lendingValue.sub(msg.value);
        commitment.availableValue = commitment.availableValue.add(msg.value);
    }
}
