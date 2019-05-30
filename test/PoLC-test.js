const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Web3 = require('web3');
const utils = require('./utils');

const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const PoLC = artifacts.require('PoLC');
const EthPool = artifacts.require('EthPool');

chai.use(chaiAsPromised);
const assert = chai.assert;

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const DAY = 60 * 60 * 24;
const BLOCK_REWARD = 100;
const LOCK_DURATION = 10;

contract('PoLC', ([owner, liba, borrower]) => {
    let ethPool;
    let token;
    let polc;
    let commitmentId;

    before(async () => {
        ethPool = await EthPool.new();
        token = await ERC20ExampleToken.new();
        polc = await PoLC.new(token.address, BLOCK_REWARD);

        await polc.setLibaAddress(liba);
        await polc.setEthPool(ethPool.address);
        await token.transfer(polc.address, BLOCK_REWARD * 1000);
    });

    it('should fail to commit eth fund for non-zero amount', async () => {
        try {
            await polc.commitFund(
                LOCK_DURATION,
                '0x0000000000000000000000000000000000000000',
                1,
                { value: '1' }
            );
        } catch (e) {
            assert.isAbove(e.message.search('amount must be zero'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should commit eth fund successfully', async () => {
        const receipt = await polc.commitFund(
            LOCK_DURATION,
            '0x0000000000000000000000000000000000000000',
            0,
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

    it('should fail to commit erc fund for invalid token address', async () => {
        try {
            await polc.commitFund(LOCK_DURATION, owner, 1);
        } catch (e) {
            assert.isAbove(
                e.message.search('token address must be contract address'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to commit erc fund for zero amount', async () => {
        try {
            await polc.commitFund(LOCK_DURATION, token.address, 0);
        } catch (e) {
            assert.isAbove(
                e.message.search('amount must be larger than zero'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to commit erc fund for non-zero value', async () => {
        try {
            await polc.commitFund(LOCK_DURATION, token.address, 1, {
                value: '1'
            });
        } catch (e) {
            assert.isAbove(e.message.search('msg value must be zero'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should commit erc fund successfully', async () => {
        const receipt = await polc.commitFund(LOCK_DURATION, token.address, 1);
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
        assert.equal(commitment.tokenAddress, token.address);
    });

    it('should withdraw erc fund successfully', async () => {
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

    it('should fail to set ethPool twice', async () => {
        try {
            await polc.setEthPool(owner);
        } catch (e) {
            assert.isAbove(
                e.message.search('ethPool can only be set once'),
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
            0,
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
        await polc.lendCommitment(owner, commitmentId, 1, borrower, {
            from: liba
        });
        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        assert.equal(commitment.availableValue.toNumber(), 0);
        assert.equal(commitment.lendingValue.toNumber(), 1);

        const balance = await ethPool.balanceOf(borrower);
        assert.equal(balance.toNumber(), 1);
    });

    it('should fail to repayCommitment for wrong sender', async () => {
        try {
            await polc.repayCommitment(owner, commitmentId, {
                value: 1
            });
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
        await polc.repayCommitment(owner, commitmentId, {
            from: liba,
            value: 1
        });
        const commitment = await polc.commitmentsByUser.call(
            owner,
            commitmentId
        );
        assert.equal(commitment.availableValue.toNumber(), 1);
        assert.equal(commitment.lendingValue.toNumber(), 0);
    });
});
