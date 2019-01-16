const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const PoLC = artifacts.require('PoLC');

const DAY = 60 * 60 * 24;

contract('PoLC', function ([owner]) {
  chai.use(chaiAsPromised);
  const assert = chai.assert;
  const blockReward = 100;
  const lockDuration = 10;

  let token;
  let polc;
  let commitmentId;

  before(async function () {
    token = await ERC20ExampleToken.new();
    polc = await PoLC.new(token.address, blockReward);
    await token.transfer(polc.address, blockReward * 1000);
  });

  it('should return correct name after construction', async () => {
    const receipt = await polc.commitFund(lockDuration, {
      value: '1',
    });
    const { event, args } = receipt.logs[0];
    assert.equal(event, 'NewCommitment');
    commitmentId = args.commitmentId.toNumber();

    const commitment = await polc.commitmentsByUser.call(owner, commitmentId);
    const lockStart = Math.ceil(commitmentId / DAY);
    assert.equal(commitment.lockStart.toNumber(), lockStart);
    assert.equal(commitment.lockEnd.toNumber(), lockStart + lockDuration);
    assert.equal(commitment.lockedValue.toNumber(), 1);
    assert.equal(commitment.availableValue.toNumber(), 1);
    assert.equal(commitment.lendingValue.toNumber(), 0);
    assert.equal(commitment.withdrawedReward.toNumber(), 0);
  });

  it('should fail to withdraw fund', async () => {
    try {
      await polc.withdrawFund(commitmentId);
    } catch (e) {
      assert.isAbove(e.message.search('commitment lock must expire'), -1);
      return;
    }

    assert.fail('should have thrown before');
  });

  it('should fail to withdraw reward', async () => {
    try {
      await polc.withdrawReward(commitmentId);
    } catch (e) {
      assert.isAbove(e.message.search('commitment lock must expire'), -1);
      return;
    }

    assert.fail('should have thrown before');
  });

  it('should withdraw fund successfully', async () => {
    await new Promise((resolve, reject) => {
      web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [(lockDuration + 2) * DAY], id: 0 }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    await new Promise((resolve, reject) => {
      web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    const receipt = await polc.withdrawFund(commitmentId);
    const { event } = receipt.logs[0];
    assert.equal(event, 'WithdrawFund');

    const commitment = await polc.commitmentsByUser.call(owner, commitmentId);
    assert.equal(commitment.availableValue.toNumber(), 0);
  });

  it('should withdraw reward successfully', async () => {
    const receipt = await polc.withdrawReward(commitmentId);
    const { event } = receipt.logs[0];
    assert.equal(event, 'WithdrawReward');

    const commitment = await polc.commitmentsByUser.call(owner, commitmentId);
    assert.equal(commitment.withdrawedReward.toNumber(), blockReward * lockDuration);
  });
});
