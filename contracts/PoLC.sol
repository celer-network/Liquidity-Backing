pragma solidity ^0.5.0;

import "./lib/IPoLC.sol";
import "./lib/TokenUtil.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract PoLC is Ownable, IPoLC, TokenUtil, Pausable {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    struct Commitment {
        address tokenAddress;
        uint lockStart;
        uint lockEnd;
        uint lockedValue;
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
    event DrainToken(address tokenAddress, uint amount);

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
     * @param _tokenAddress token address
     * @param _duration lock-in duration by days
     * @param _value committed value
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
            _duration > 0 && _duration < 365,
            "duration must fall into the 0-365 range"
        );

        address sender = msg.sender;
        uint currentTimestamp = block.timestamp;
        uint value = _value;

        if (_tokenAddress != address(0)) {
            IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _value);
        }

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
        commitment.tokenAddress = _tokenAddress;

        mapping (uint => uint) storage powerByTime = powerByTokenTime[_tokenAddress];
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
     * @notice Withdraw all available reward in a commitment
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
        uint totalReward = 0;
        uint power = commitment.lockedValue.mul(
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
        returns (address, uint)
    {
        Commitment storage commitment = commitmentsByUser[_user][_commitmentId];
        return (commitment.tokenAddress, commitment.availableValue);
    }

    /**
     * @notice Calculate the fee required to launch an auction
     * @param _tokenAddress token address
     * @param _value Value to borrow
     * @param _duration Duration for the borrowing
     */
    function calculateBorrowFee(
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
            totalPower = totalPower + powerByTime[i];
        }

        if (totalPower == 0) {
            return blockReward.mul(_duration);
        }

        return _value.mul(_duration).mul(_duration).mul(blockReward).div(totalPower);
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
        address payable _borrower
    )
        external
        whenNotPaused
    {
        require(msg.sender == libaAddress, "sender must be liba contract");
        Commitment storage commitment = commitmentsByUser[_user][_commitmentId];
        require(_value <= commitment.availableValue, "value must be smaller than available value");

        commitment.availableValue = commitment.availableValue.sub(_value);
        commitment.lendingValue = commitment.lendingValue.add(_value);
        _transfer(commitment.tokenAddress, _borrower, _value);
    }

   /**
     * @notice Repay to the commitment
     * @param _user User address
     * @param _commitmentId ID of the commitment
     * @param _value borrow value
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

    /**
     * @notice Onwer drains one type of tokens when paused
     * @dev This is for emergency situations.
     * @param _tokenAddress address of token to drain
     * @param _amount drained token amount
     */
    function drainToken(
        address _tokenAddress,
        uint _amount
    )
        external
        whenPaused
        onlyOwner
    {
        _transfer(_tokenAddress, msg.sender, _amount);
        emit DrainToken(_tokenAddress, _amount);
    }
}
