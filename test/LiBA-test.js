const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Web3 = require('web3');

const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const EthPool = artifacts.require('EthPool');
const LiBA = artifacts.require('LiBA');
const PoLC = artifacts.require('PoLC');

chai.use(chaiAsPromised);
const assert = chai.assert;
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const AUCTION_DEPOSIT = 100;
const BID_DURATION = 8;
const REVEAL_DURATION = 10;
const CLAIM_DURATION = 2;
const CHALLENGE_DURATION = 2;
const FINALIZE_DURATION = 2;
const VALUE = 100;
const DURATION = 1;
const MAX_RATE = 10;
const MIN_VALUE = 2;
const BID0 = {
    rate: 5,
    value: VALUE,
    celerValue: 1000,
    salt: 100,
    commitmentId: 0
};
const BID1 = {
    ...BID0,
    rate: 4,
    commitmentId: 0
};

const calculateBidHash = bid => {
    const { rate, value, celerValue, salt } = bid;
    bid.hash = web3.utils.soliditySha3(rate, value, celerValue, salt);
};

calculateBidHash(BID0);
calculateBidHash(BID1);

contract('LiBA', ([provider, bidder0, bidder1]) => {
    let ethPool;
    let token;
    let liba;
    let polc;
    let auctionId;

    before(async () => {
        ethPool = await EthPool.new();
        token = await ERC20ExampleToken.new();
        polc = await PoLC.new(token.address, 100);
        liba = await LiBA.new(
            token.address,
            polc.address,
            AUCTION_DEPOSIT,
            false
        );

        await polc.setLibaAddress(liba.address);
        await polc.setEthPool(ethPool.address);
        await token.transfer(provider, 10000);
        await token.transfer(bidder0, 10000);
        await token.transfer(bidder1, 10000);
    });

    it('should fail to init auction for missing auction deposit', async () => {
        try {
            await liba.initAuction(
                BID_DURATION,
                REVEAL_DURATION,
                CLAIM_DURATION,
                CHALLENGE_DURATION,
                FINALIZE_DURATION,
                VALUE,
                DURATION,
                MAX_RATE,
                MIN_VALUE
            );
        } catch (e) {
            assert.isAbove(
                e.message.search('VM Exception while processing transaction'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should init auction successfully', async () => {
        await token.approve(liba.address, AUCTION_DEPOSIT * 10);
        const receipt = await liba.initAuction(
            BID_DURATION,
            REVEAL_DURATION,
            CLAIM_DURATION,
            CHALLENGE_DURATION,
            FINALIZE_DURATION,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE
        );

        const { event, args } = receipt.logs[0];
        auctionId = args.auctionId.toNumber();
        assert.equal(event, 'NewAuction');
        assert.equal(args.asker, provider);
        assert.equal(auctionId, 0);

        const auction = await liba.getAuction.call(auctionId);
        const latestBlock = await web3.eth.getBlockNumber();
        assert.equal(auction.asker, provider);
        assert.equal(auction.value.toNumber(), VALUE);
        assert.equal(auction.duration.toNumber(), DURATION);
        assert.equal(auction.maxRate.toNumber(), MAX_RATE);
        assert.equal(auction.minValue.toNumber(), MIN_VALUE);
        assert.equal(auction.bidEnd.toNumber(), latestBlock + BID_DURATION);
        assert.equal(
            auction.revealEnd.toNumber(),
            auction.bidEnd.toNumber() + REVEAL_DURATION
        );
        assert.equal(
            auction.claimEnd.toNumber(),
            auction.revealEnd.toNumber() + CLAIM_DURATION
        );
        assert.equal(
            auction.challengeEnd.toNumber(),
            auction.claimEnd.toNumber() + CHALLENGE_DURATION
        );
        assert.equal(
            auction.finalizeEnd.toNumber(),
            auction.challengeEnd.toNumber() + FINALIZE_DURATION
        );
    });

    it('should fail to bid auction for missing celer token', async () => {
        try {
            await liba.placeBid(1, BID0.hash, BID0.celerValue);
        } catch (e) {
            assert.isAbove(
                e.message.search('VM Exception while processing transaction'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    const placeBid = async (bid, bidder, eventName) => {
        await token.approve(liba.address, bid.celerValue, { from: bidder });
        const receipt = await liba.placeBid(
            auctionId,
            bid.hash,
            bid.celerValue,
            {
                from: bidder
            }
        );
        const { event, args } = receipt.logs[0];
        assert.equal(event, eventName);
        assert.equal(args.auctionId.toNumber(), auctionId);
        assert.equal(args.bidder, bidder);

        const userBid = await liba.bidsByUser.call(bidder, auctionId);
        assert.equal(userBid.hash, bid.hash);
        assert.equal(userBid.celerValue.toNumber(), bid.celerValue);
    };

    it('should bid auction correctly', async () => {
        await placeBid(BID0, bidder0, 'NewBid');
        await placeBid(BID1, bidder1, 'NewBid');
    });

    it('should update bid correctly', async () => {
        await placeBid(BID0, bidder0, 'UpdateBid');
    });

    it('should fail to bid auction for passing bid duration', async () => {
        try {
            await placeBid(BID0, bidder0);
        } catch (e) {
            assert.isAbove(e.message.search('must be within bid duration'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    const revealBid = async (bid, bidder) => {
        const { rate, value, celerValue, salt, commitmentId } = bid;
        const receipt = await liba.revealBid(
            auctionId,
            rate,
            value,
            celerValue,
            salt,
            commitmentId,
            {
                from: bidder
            }
        );
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'RevealBid');
        assert.equal(args.auctionId.toNumber(), auctionId);
        assert.equal(args.bidder, bidder);

        const userBid = await liba.bidsByUser.call(bidder, auctionId);
        assert.equal(
            userBid.hash,
            '0x0000000000000000000000000000000000000000000000000000000000000000'
        );
        assert.equal(userBid.rate.toNumber(), rate);
        assert.equal(userBid.value.toNumber(), value);
        assert.equal(userBid.celerValue.toNumber(), celerValue);
    };

    it('should fail to reveal auction for large rate', async () => {
        try {
            await revealBid({ ...BID0, rate: MAX_RATE + 1 }, bidder0);
        } catch (e) {
            assert.isAbove(
                e.message.search('rate must be smaller than maxRate'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to reveal auction for small value', async () => {
        try {
            await revealBid({ ...BID0, value: MIN_VALUE - 1 }, bidder0);
        } catch (e) {
            assert.isAbove(
                e.message.search('value must be larger than minValue'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to reveal auction for wrong hash', async () => {
        try {
            await revealBid({ ...BID0, salt: BID0.salt - 1 }, bidder0);
        } catch (e) {
            assert.isAbove(
                e.message.search('hash must be same as the bid hash'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to reveal auction for lacking commitment', async () => {
        try {
            await revealBid(BID0, bidder0);
        } catch (e) {
            assert.isAbove(
                e.message.search('must have enough value in commitment'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    const commitFund = async (bid, bidder) => {
        const receipt = await polc.commitFund(100, {
            value: bid.value,
            from: bidder
        });
        const { args } = receipt.logs[0];
        bid.commitmentId = args.commitmentId.toNumber();
    };

    it('should reveal auction correctly', async () => {
        await commitFund(BID0, bidder0);
        await commitFund(BID1, bidder1);
        await revealBid(BID0, bidder0);
        await revealBid(BID1, bidder1);
    });

    it('should fail to reveal auction for passing reveal duration', async () => {
        try {
            await revealBid(BID0, bidder0);
        } catch (e) {
            assert.isAbove(
                e.message.search('must be within reveal duration'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to claim winner for wrong asker', async () => {
        try {
            await liba.claimWinners(auctionId, [bidder0], { from: bidder0 });
        } catch (e) {
            assert.isAbove(
                e.message.search('sender must be the auction asker'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should claim winner successfully', async () => {
        const receipt = await liba.claimWinners(auctionId, [bidder0], {
            from: provider
        });
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'ClaimWinners');
        assert.deepEqual(args.winners, [bidder0]);
    });

    it('should fail to claim winner for passing claim duration', async () => {
        try {
            await liba.claimWinners(auctionId, [bidder0], { from: provider });
        } catch (e) {
            assert.isAbove(
                e.message.search('must be within claim duration'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should challenge winner successfully', async () => {
        const receipt = await liba.challengeWinners(auctionId, [bidder1], {
            from: bidder1
        });
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'ChallengeWinners');
        assert.deepEqual(args.challenger, bidder1);
        assert.deepEqual(args.winners, [bidder1]);
    });

    it('should fail to challenge winner for invalid challenger', async () => {
        try {
            await liba.challengeWinners(auctionId, [bidder0], {
                from: bidder0
            });
        } catch (e) {
            assert.isAbove(e.message.search('must be valid challenger'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to finalize auction for before challenge duration end', async () => {
        try {
            await liba.finalizeAuction(auctionId, {
                from: bidder1
            });
        } catch (e) {
            assert.isAbove(
                e.message.search('must be within finalize duration'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to challenge winner for passing challenge duration', async () => {
        try {
            await liba.challengeWinners(auctionId, [bidder1], {
                from: bidder1
            });
        } catch (e) {
            assert.isAbove(e.message.search('must be within challenge'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should finalize auction successfully', async () => {
        const receipt = await liba.finalizeAuction(auctionId);
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'FinalizeAuction');
        assert.deepEqual(args.auctionId.toNumber(), auctionId);

        const balance = await ethPool.balanceOf(provider);
        assert.equal(balance.toNumber(), BID1.value);
    });

    it('should repay auction successfully', async () => {
        const value = BID1.value + (BID1.value * BID1.rate) / 100;
        const receipt = await liba.repayAuction(auctionId, { value });
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'RepayAuction');
        assert.deepEqual(args.auctionId.toNumber(), auctionId);
    });

    it('should fail to init auction for missing from whitelist', async () => {
        liba = await LiBA.new(
            token.address,
            polc.address,
            AUCTION_DEPOSIT,
            true
        );
        await token.approve(liba.address, AUCTION_DEPOSIT * 10);

        try {
            await liba.initAuction(
                BID_DURATION,
                REVEAL_DURATION,
                CLAIM_DURATION,
                CHALLENGE_DURATION,
                FINALIZE_DURATION,
                VALUE,
                DURATION,
                MAX_RATE,
                MIN_VALUE
            );
        } catch (e) {
            assert.isAbove(e.message.search('sender must be in whitelist'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should init auction successfully if in whitelist', async () => {
        await liba.updateWhitelist(provider, true);
        await liba.initAuction(
            BID_DURATION,
            REVEAL_DURATION,
            CLAIM_DURATION,
            CHALLENGE_DURATION,
            FINALIZE_DURATION,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE
        );
    });
});
