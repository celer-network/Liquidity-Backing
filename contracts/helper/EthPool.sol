pragma solidity ^0.5.0;

import "./EthPoolInterface.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title ETH Pool providing an ERC20 like interface
 * @notice Implementation of an ERC20 like pool for native ETH.
 * @notice Originally based on code of ERC20 by openzeppelin-solidity v2.1.2
 *   https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v2.1.2/contracts/token/ERC20/ERC20.sol
 */
contract EthPool is EthPoolInterface {
    using SafeMath for uint;

    mapping (address => uint) private _balances;

    mapping (address => mapping (address => uint)) private _allowed;

    /**
     * @notice Deposit ETH to ETH Pool
     * @param recipient the address ETH is deposited to
     */
    function deposit(address recipient) public payable {
        require(recipient != address(0));

        _balances[recipient] = _balances[recipient].add(msg.value);
        emit Deposit(recipient, msg.value);
    }

    /**
     * @notice Withdraw ETH from ETH Pool
     * @param value the amount of ETH to withdraw
     */
    function withdraw(uint value) public {
        require(_balances[msg.sender] >= value);

        _balances[msg.sender] = _balances[msg.sender].sub(value);
        emit Withdraw(msg.sender, value);
        msg.sender.transfer(value);
    }

    /**
     * @notice Approve the passed address to spend the specified amount of ETH on behalf of msg.sender.
     * @notice Beware that changing an allowance with this method brings the risk that someone may use both the old
     *   and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
     *   race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
     *   https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * @param spender The address which will spend the funds.
     * @param value The amount of ETH to be spent.
     */
    function approve(address spender, uint value) public returns (bool) {
        require(spender != address(0));

        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * @notice Transfer ETH from one address to another.
     * @notice Note that while this function emits an Approval event, this is not required as per the specification.
     * @param from address The address which you want to send ETH from
     * @param to address The address which you want to transfer to
     * @param value uint the amount of ETH to be transferred
     */
    function transferFrom(address from, address payable to, uint value) public returns (bool) {
        _allowed[from][msg.sender] = _allowed[from][msg.sender].sub(value);
        _transfer(from, to, value);
        emit Approval(from, msg.sender, _allowed[from][msg.sender]);
        return true;
    }

    /**
     * @notice Increase the amount of ETH that an owner allowed to a spender.
     * @notice approve should be called when allowed_[_spender] == 0. To increment
     *   allowed value is better to use this function to avoid 2 calls (and wait until
     *   the first transaction is mined)
     *   From MonolithDAO Token.sol
     *   Emits an Approval event.
     * @param spender The address which will spend the funds.
     * @param addedValue The amount of ETH to increase the allowance by.
     */
    function increaseAllowance(address spender, uint addedValue) public returns (bool) {
        require(spender != address(0));

        _allowed[msg.sender][spender] = _allowed[msg.sender][spender].add(addedValue);
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    /**
     * @notice Decrease the amount of ETH that an owner allowed to a spender.
     * @notice approve should be called when allowed_[_spender] == 0. To decrement
     *   allowed value is better to use this function to avoid 2 calls (and wait until
     *   the first transaction is mined)
     *   From MonolithDAO Token.sol
     *   Emits an Approval event.
     * @param spender The address which will spend the funds.
     * @param subtractedValue The amount of ETH to decrease the allowance by.
     */
    function decreaseAllowance(address spender, uint subtractedValue) public returns (bool) {
        require(spender != address(0));

        _allowed[msg.sender][spender] = _allowed[msg.sender][spender].sub(subtractedValue);
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    /**
    * @notice Transfer ETH for a specified addresses
    * @param from The address to transfer from.
    * @param to The address to transfer to.
    * @param value The amount to be transferred.
    */
    function _transfer(address from, address payable to, uint value) internal {
        require(to != address(0));

        _balances[from] = _balances[from].sub(value);
        emit Transfer(from, to, value);
        to.transfer(value);
    }

    /**
    * @notice Gets the balance of the specified address.
    * @param owner The address to query the balance of.
    * @return An uint representing the amount owned by the passed address.
    */
    function balanceOf(address owner) public view returns (uint) {
        return _balances[owner];
    }

    /**
     * @notice Function to check the amount of ETH that an owner allowed to a spender.
     * @param owner address The address which owns the funds.
     * @param spender address The address which will spend the funds.
     * @return A uint specifying the amount of ETH still available for the spender.
     */
    function allowance(address owner, address spender) public view returns (uint) {
        return _allowed[owner][spender];
    }
}
