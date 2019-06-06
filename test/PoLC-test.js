const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Web3 = require('web3');
const utils = require('./utils');

const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const PoLC = artifacts.require('PoLC');

chai.use(chaiAsPromised);
const assert = chai.assert;

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const DAY = 60 * 60 * 24;
const BLOCK_REWARD = 100;
const LOCK_DURATION = 10;

contract('PoLC', ([owner, liba, borrower]) => {
    let polc;
    let commitToken;
    let celerToken;
    let commitmentId;

    before(async () => {
        commitToken = await ERC20ExampleToken.new();
        celerToken = await ERC20ExampleToken.new();
        polc = await PoLC.new(celerToken.address, BLOCK_REWARD);

        await polc.setLibaAddress(liba);
        await celerToken.transfer(polc.address, BLOCK_REWARD * 1000);
        await commitToken.approve(polc.address, 1);
    });

    it('should fail to commit eth fund for unequal value', async () => {
        try {
            await polc.commitFund(
                LOCK_DURATION,
                '0x0000000000000000000000000000000000000000',
                2,
                { value: '1' }
            );
        } catch (e) {
            assert.isAbove(
                e.message.search('value must be equal msg value'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should commit eth fund successfully', async () => {
        const receipt = await polc.commitFund(
            LOCK_DURATION,
            '0x0000000000000000000000000000000000000000',
            1,
            { value: '1' }
        );
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'NewCommitment');
        commitmentId = args.commitmentId.toNumber();

        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        const lockStart = Math.ceil(commitmentId / DAY);
        assert.equal(commitment.lockStart.toNumber(), lockStart);
        assert.equal(commitment.lockEnd.toNumber(), lockStart + LOCK_DURATION);
        assert.equal(commitment.lockedValue.toNumber(), 1);
        assert.equal(commitment.availableValue.toNumber(), 1);
        assert.equal(commitment.lendingValue.toNumber(), 0);
        assert.equal(commitment.withdrawedReward.toNumber(), 0);
    });

    it('should fail to withdraw fund for before lock expire', async () => {
        try {
            await polc.withdrawFund(commitmentId);
        } catch (e) {
            assert.isAbove(e.message.search('commitment lock must expire'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to withdraw reward for before lock expire', async () => {
        try {
            await polc.withdrawReward(commitmentId);
        } catch (e) {
            assert.isAbove(e.message.search('commitment lock must expire'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should withdraw eth fund successfully', async () => {
        await utils.updateTimestamp((LOCK_DURATION + 2) * DAY);

        const receipt = await polc.withdrawFund(commitmentId);
        const { event } = receipt.logs[0];
        assert.equal(event, 'WithdrawFund');

        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        assert.equal(commitment.availableValue.toNumber(), 0);
    });

    it('should withdraw reward successfully', async () => {
        const receipt = await polc.withdrawReward(commitmentId);
        const { event } = receipt.logs[0];
        assert.equal(event, 'WithdrawReward');

        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        assert.equal(
            commitment.withdrawedReward.toNumber(),
            BLOCK_REWARD * LOCK_DURATION
        );
    });

    it('should fail to commit ERC20 fund for unsupported token address', async () => {
        try {
            await polc.commitFund(LOCK_DURATION, commitToken.address, 1);
        } catch (e) {
            assert.isAbove(
                e.message.search('token address must be supported'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to commit ERC20 fund for non-zero value', async () => {
        await polc.updateSupportedToken(commitToken.address, true);
        try {
            await polc.commitFund(LOCK_DURATION, commitToken.address, 1, {
                value: '1'
            });
        } catch (e) {
            assert.isAbove(e.message.search('msg value must be zero'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should commit ERC20 fund successfully', async () => {
        const receipt = await polc.commitFund(
            LOCK_DURATION,
            commitToken.address,
            1
        );
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'NewCommitment');
        commitmentId = args.commitmentId.toNumber();

        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        const lockStart = Math.ceil(commitmentId / DAY);
        assert.equal(commitment.lockStart.toNumber(), lockStart);
        assert.equal(commitment.lockEnd.toNumber(), lockStart + LOCK_DURATION);
        assert.equal(commitment.lockedValue.toNumber(), 1);
        assert.equal(commitment.availableValue.toNumber(), 1);
        assert.equal(commitment.lendingValue.toNumber(), 0);
        assert.equal(commitment.withdrawedReward.toNumber(), 0);
        assert.equal(commitment.tokenAddress, commitToken.address);
    });

    it('should withdraw ERC20 fund successfully', async () => {
        await utils.updateTimestamp((LOCK_DURATION + 2) * DAY);

        const receipt = await polc.withdrawFund(commitmentId);
        const { event } = receipt.logs[0];
        assert.equal(event, 'WithdrawFund');

        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        assert.equal(commitment.availableValue.toNumber(), 0);
    });

    it('should fail to set liba address twice', async () => {
        try {
            await polc.setLibaAddress(owner);
        } catch (e) {
            assert.isAbove(
                e.message.search('libaAddress can only be set once'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to lendCommitment for wrong sender', async () => {
        try {
            await polc.lendCommitment(owner, commitmentId, 1, borrower);
        } catch (e) {
            assert.isAbove(
                e.message.search('sender must be liba contract'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to lendCommitment for exceeding available value', async () => {
        const receipt = await polc.commitFund(
            LOCK_DURATION,
            '0x0000000000000000000000000000000000000000',
            1,
            { value: '1' }
        );
        const { args } = receipt.logs[0];
        commitmentId = args.commitmentId.toNumber();

        try {
            await polc.lendCommitment(owner, commitmentId, 2, borrower, {
                from: liba
            });
        } catch (e) {
            assert.isAbove(
                e.message.search('value must be smaller than available value'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should lendCommitment successfully', async () => {
        const balance0 = await web3.eth.getBalance(borrower);

        await polc.lendCommitment(owner, commitmentId, 1, borrower, {
            from: liba
        });
        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        assert.equal(commitment.availableValue.toNumber(), 0);
        assert.equal(commitment.lendingValue.toNumber(), 1);

        const balance1 = await web3.eth.getBalance(borrower);
        assert.equal(balance1.slice(-2) - balance0.slice(-2), 1);
    });

    it('should fail to repayCommitment for wrong sender', async () => {
        try {
            await polc.repayCommitment(owner, commitmentId, 1, { value: '1' });
        } catch (e) {
            assert.isAbove(
                e.message.search('sender must be liba contract'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should repayCommitment successfully', async () => {
        await polc.repayCommitment(owner, commitmentId, 1, {
            from: liba,
            value: '1'
        });
        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        assert.equal(commitment.availableValue.toNumber(), 1);
        assert.equal(commitment.lendingValue.toNumber(), 0);
    });
});
