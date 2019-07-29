pragma solidity ^0.5.0;

import "./lib/IPoLC.sol";
import "./lib/TokenUtil.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

/**
 * @title PoLC
 * @notice Contract allows user to lock fund and collect reward.
 */
contract PoLC is Ownable, Pausable, IPoLC, TokenUtil {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    struct Commitment {
        address tokenAddress;
        bool locked;
        uint lockStart;
        uint lockEnd;
        uint committedValue;
        uint availableValue;
        uint lendingValue;
        uint withdrawedReward;
    }

    address private libaAddress;
    IERC20 private celerToken;
    // reward payout for each block
    uint private blockReward;
    // mapping mining power by day
    mapping(
        address => mapping(uint => uint)
    ) private powerByTokenTime;
    // mapping user address to its commitments
    mapping(
        address => mapping (uint => Commitment)
    ) public commitmentsByUser;

    constructor(address _celerTokenAddress, uint _blockReward) public {
        celerToken = IERC20(_celerTokenAddress);
        blockReward = _blockReward;

        // Enable eth support by default
        supportedTokens[address(0)] = true;
    }

    event NewCommitment(uint commitmentId, address indexed user);
    event WithdrawFund(uint commitmentId);
    event WithdrawReward(uint commitmentId);

    /**
     * @notice Check if the commitment exists and its lock has expired
     * @param _commitmentId ID of the commitment
     */
    modifier lockExpired(uint _commitmentId) {
        Commitment memory commitment = commitmentsByUser[msg.sender][_commitmentId];
        require(
            commitment.committedValue != 0,
            "commitment must exist"
        );
        require(
            commitment.lockEnd < block.timestamp.div(1 days),
            "commitment lock must expire"
        );
        _;
    }

    /**
     * @notice Lock fund into the PoLC contract for a specific duration.
     * The longer the duration and larger locked token value, more rewards will be earned.
     * Once, the fund is locked, it can only be drawn when the lock expired.
     * If the duration is set to 0, the fund will be lock-free, but there will be no reward.
     * @param _tokenAddress Address of the locked token. For ETH, it will be 0
     * @param _duration lock-in duration by days
     * @param _value committed token value
     */
    function commitFund(
        address _tokenAddress,
        uint _duration,
        uint _value
    )
        external
        payable
        whenNotPaused
        validateToken(_tokenAddress, _value)
    {
        require(
            _duration >= 0 && _duration < 365,
            "duration must fall into the 0-365 range"
        );
        require(_value > 0, "value must be larger than 0");

        address sender = msg.sender;
        uint currentTimestamp = block.timestamp;
        uint value = _value;

        if (_tokenAddress != address(0)) {
            IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _value);
        }

        Commitment storage commitment = commitmentsByUser[sender][currentTimestamp];
        require(
            commitment.committedValue == 0,
            "one timestamp can only have one commitment"
        );

        commitment.tokenAddress = _tokenAddress;
        commitment.locked = false;
        commitment.committedValue = value;
        commitment.availableValue = value;

        if (_duration > 0) {
            uint lockStart = currentTimestamp.div(1 days).add(1);
            uint lockEnd = lockStart.add(_duration);
            commitment.locked = true;
            commitment.lockStart = lockStart;
            commitment.lockEnd = lockEnd;
            mapping (uint => uint) storage powerByTime = powerByTokenTime[_tokenAddress];
            uint power = value.mul(_duration);
            for (uint i = lockStart; i < lockEnd; i++) {
                powerByTime[i] = powerByTime[i].add(power);
            }
        }

        emit NewCommitment(currentTimestamp, sender);
    }

    /**
     * @notice Withdraw all available fund in a commitment if its lock has expired
     * @param _commitmentId ID of the commitment
     */
    function withdrawFund(
        uint _commitmentId
    )
        external
        whenNotPaused
        lockExpired(_commitmentId)
    {
        Commitment storage commitment = commitmentsByUser[msg.sender][_commitmentId];
        uint availableValue = commitment.availableValue;
        commitment.availableValue = 0;
        _transfer(commitment.tokenAddress, msg.sender, availableValue);

        emit WithdrawFund(_commitmentId);
    }

    /**
     * @notice Withdraw all available reward in a commitment if the lock has expired
     * @param _commitmentId ID of the commitment
     */
    function withdrawReward(
        uint _commitmentId
    )
        external
        whenNotPaused
        lockExpired(_commitmentId)
    {
        Commitment storage commitment = commitmentsByUser[msg.sender][_commitmentId];
        require(commitment.locked, "commiment must be locked to get reward");
        uint totalReward = 0;
        uint power = commitment.committedValue.mul(
            commitment.lockEnd.sub(commitment.lockStart)
        );
        mapping (uint => uint) storage powerByTime = powerByTokenTime[commitment.tokenAddress];
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
     * @notice Calculate the fee required to launch an auction in LiBA
     * @param _tokenAddress Token address
     * @param _value Value to borrow
     * @param _duration Duration for the borrowing
     */
    function calculateAuctionFee(
        address _tokenAddress,
        uint _value,
        uint _duration
    )
        external
        view
        returns (uint)
    {
        mapping (uint => uint) storage powerByTime = powerByTokenTime[_tokenAddress];
        uint borrowStart = block.timestamp.div(1 days).add(1);
        uint borrowEnd = borrowStart.add(_duration);
        uint totalPower = 0;

        for (uint i = borrowStart; i < borrowEnd; i++) {
            totalPower = totalPower.add(powerByTime[i]);
        }

        if (totalPower == 0) {
            return blockReward.mul(_duration);
        }

        return _value.mul(_duration).mul(_duration).mul(blockReward).div(totalPower);
    }

    /**
     * @notice Send a specific value to Liba for lending. Can only be called from LiBA
     * @param _user User address
     * @param _commitmentId ID of the commitment
     * @param _tokenAddress Address of token intended to lend
     * @param _value Value to lend
     */
    function lendCommitment(
        address _user,
        uint _commitmentId,
        address _tokenAddress,
        uint _value,
    )
        external
        whenNotPaused
    {
        require(msg.sender == libaAddress, "sender must be liba contract");
        Commitment storage commitment = commitmentsByUser[_user][_commitmentId];
        require(commiment.tokenAddress == _tokenAddress, "commiment tokenAddress must match _tokenAddress");

        commitment.availableValue = commitment.availableValue.sub(_value);
        commitment.lendingValue = commitment.lendingValue.add(_value);
        _transfer(commitment.tokenAddress, libaAddress, _value);
    }

   /**
     * @notice Repay to the commitment when borrower returns money through LiBA
     * @param _user User address
     * @param _commitmentId ID of the commitment
     * @param _value value to repay
     */
    function repayCommitment(
        address _user,
        uint _commitmentId,
        uint _value
    )
        external
        payable
    {
        require(msg.sender == libaAddress, "sender must be liba contract");
        Commitment storage commitment = commitmentsByUser[_user][_commitmentId];

        commitment.lendingValue = commitment.lendingValue.sub(_value);
        commitment.availableValue = commitment.availableValue.add(_value);

        if (commitment.tokenAddress == address(0)) {
            require(msg.value == _value, "value must match msg value");
        } else {
            IERC20(commitment.tokenAddress).safeTransferFrom(tx.origin, address(this), _value);
        }
    }
}
