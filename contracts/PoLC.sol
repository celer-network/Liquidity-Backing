pragma solidity ^0.5.0;

import "./helper/EthPoolInterface.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract PoLC is Ownable {
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
    address private libaAddress;
    EthPoolInterface private ethPool;
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
     * @dev Check if the commitment lock has expired
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
     * @dev Withdraw all available fund in a commitment
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
     * @dev Withdraw all available reward in a commitment
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

    /**
     * @dev Set libaAddress state variable
     * @param _libaAddress Liba address
     */
    function setLibaAddress(address _libaAddress) public onlyOwner
    {
        require(libaAddress == address(0), "libaAddress can only be set once");
        libaAddress = _libaAddress;
    }

   /**
     * @dev Set eth pool address
     * @param _ethPoolAddress ethPool address
     */
    function setEthPool(address _ethPoolAddress) public onlyOwner
    {
        require(address(ethPool) == address(0), "ethPool can only be set once");
        ethPool = EthPoolInterface(_ethPoolAddress);
    }

    /**
     * @dev Get available value for specific commitment of a user
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
     * @dev Lend borrower a specific value
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
     * @dev Repay to the commitment
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
