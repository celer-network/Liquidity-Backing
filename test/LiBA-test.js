const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Web3 = require('web3');
const utils = require('./utils');
const helper = require('./helper');

const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const LiBAStruct = artifacts.require('LiBAStruct');
const LiBAAsker = artifacts.require('LiBAAsker');
const LiBABidder = artifacts.require('LiBABidder');
const LiBA = artifacts.require('LiBA');
const PoLC = artifacts.require('PoLC');

chai.use(chaiAsPromised);
const assert = chai.assert;
const web3 = new Web3('http://localhost:8545');

const AUCTION_DEPOSIT = 100;
const BID_DURATION = 8;
const REVEAL_DURATION = 8;
const CLAIM_DURATION = 3;
const CHALLENGE_DURATION = 2;
const FINALIZE_DURATION = 4;
const VALUE = 100;
const DURATION = 2;
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
    rate: 4
};

contract('LiBA', ([provider, bidder0, bidder1, bidder2]) => {
    let celerToken;
    let borrowToken;
    let liba;
    let polc;
    let auctionId;
    let libaHelper;

    before(async () => {
        celerToken = await ERC20ExampleToken.new();
        borrowToken = await ERC20ExampleToken.new();
        polc = await PoLC.new(celerToken.address, AUCTION_DEPOSIT / 2);

        const libaStruct = await LiBAStruct.new();
        await LiBAAsker.link('LiBAStruct', libaStruct.address);
        const libaAsker = await LiBAAsker.new();
        await LiBABidder.link('LiBAStruct', libaStruct.address);
        const libaBidder = await LiBABidder.new();

        await LiBA.link('LiBAStruct', libaStruct.address);
        await LiBA.link('LiBAAsker', libaAsker.address);
        await LiBA.link('LiBABidder', libaBidder.address);
        liba = await LiBA.new(celerToken.address, polc.address, false, 10);

        await polc.setLibaAddress(liba.address);
        await liba.updateSupportedToken(borrowToken.address, true);
        await polc.updateSupportedToken(borrowToken.address, true);
        await celerToken.transfer(provider, 10000);
        await celerToken.transfer(bidder0, 10000);
        await celerToken.transfer(bidder1, 10000);
        await celerToken.transfer(bidder2, 10000);

        libaHelper = new helper.LiBAHelper(polc, liba, celerToken);
        utils.calculateBidHash(BID0);
        utils.calculateBidHash(BID1);
    });

    it('should init auction successfully', async () => {
        await borrowToken.approve(liba.address, VALUE);
        const receipt = await liba.initAuction(
            utils.EMPTY_ADDRESS,
            BID_DURATION,
            REVEAL_DURATION,
            CLAIM_DURATION,
            CHALLENGE_DURATION,
            FINALIZE_DURATION,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE,
            borrowToken.address,
            VALUE
        );

        const { event, args } = receipt.logs[0];
        auctionId = args.auctionId.toNumber();
        libaHelper.setAuctionId(auctionId);
        assert.equal(event, 'NewAuction');
        assert.equal(args.asker, provider);
        assert.equal(auctionId, 0);

        const auction = await liba.getAuction.call(auctionId);
        const auctionPeriod = await liba.getAuctionPeriod.call(auctionId);
        const latestBlock = await web3.eth.getBlockNumber();
        assert.equal(auction.asker, provider);
        assert.equal(auction.value.toNumber(), VALUE);
        assert.equal(auction.duration.toNumber(), DURATION);
        assert.equal(auction.maxRate.toNumber(), MAX_RATE);
        assert.equal(auction.minValue.toNumber(), MIN_VALUE);
        assert.equal(
            auctionPeriod.bidEnd.toNumber(),
            latestBlock + BID_DURATION
        );
        assert.equal(
            auctionPeriod.revealEnd.toNumber(),
            auctionPeriod.bidEnd.toNumber() + REVEAL_DURATION
        );
        assert.equal(
            auctionPeriod.claimEnd.toNumber(),
            auctionPeriod.revealEnd.toNumber() + CLAIM_DURATION
        );
        assert.equal(
            auctionPeriod.challengeEnd.toNumber(),
            auctionPeriod.claimEnd.toNumber() + CHALLENGE_DURATION
        );
        assert.equal(
            auctionPeriod.finalizeEnd.toNumber(),
            auctionPeriod.challengeEnd.toNumber() + FINALIZE_DURATION
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

    it('should bid auction correctly', async () => {
        await libaHelper.placeBid(BID0, bidder0, 'NewBid');
        await libaHelper.placeBid(BID1, bidder1, 'NewBid');
    });

    it('should update bid correctly', async () => {
        await libaHelper.placeBid(BID0, bidder0, 'UpdateBid');
    });

    it('should fail to bid auction for passing bid duration', async () => {
        try {
            await libaHelper.placeBid(BID0, bidder0);
        } catch (e) {
            assert.isAbove(e.message.search('must be within bid duration'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to reveal auction for large rate', async () => {
        try {
            await libaHelper.revealBid(
                { ...BID0, rate: MAX_RATE + 1 },
                bidder0
            );
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
            await libaHelper.revealBid(
                { ...BID0, value: MIN_VALUE - 1 },
                bidder0
            );
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
            await libaHelper.revealBid(
                { ...BID0, salt: BID0.salt - 1 },
                bidder0
            );
        } catch (e) {
            assert.isAbove(
                e.message.search('hash must be same as the bid hash'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should reveal auction correctly', async () => {
        await libaHelper.commitFund(BID0, bidder0);
        await libaHelper.commitFund(BID1, bidder1);
        await libaHelper.revealBid(BID0, bidder0);
        await libaHelper.revealBid(BID1, bidder1);
    });

    it('should fail to reveal auction for passing reveal duration', async () => {
        try {
            await libaHelper.revealBid(BID0, bidder0);
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
            await liba.claimWinners(auctionId, [bidder0], bidder1, {
                from: bidder0
            });
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
        const receipt = await liba.claimWinners(auctionId, [bidder0], bidder1, {
            from: provider
        });
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'ClaimWinners');
        assert.deepEqual(args.winners, [bidder0]);
    });

    it('should fail to claim winner for passing claim duration', async () => {
        try {
            await liba.claimWinners(auctionId, [bidder0], bidder1, {
                from: provider
            });
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
        const receipt = await liba.challengeWinners(
            auctionId,
            bidder1,
            [bidder1],
            bidder0,
            {
                from: bidder1
            }
        );
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'ChallengeWinners');
        assert.deepEqual(args.challenger, bidder1);
        assert.deepEqual(args.winners, [bidder1]);
    });

    it('should fail to challenge winner for invalid challenger', async () => {
        try {
            await liba.challengeWinners(
                auctionId,
                bidder1,
                [bidder0],
                bidder1,
                {
                    from: bidder0
                }
            );
        } catch (e) {
            assert.isAbove(e.message.search('must be a valid challenger'), -1);
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
                e.message.search('must be after challenge duration'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to challenge winner for passing challenge duration', async () => {
        try {
            await liba.challengeWinners(
                auctionId,
                bidder1,
                [bidder1],
                bidder0,
                {
                    from: bidder1
                }
            );
        } catch (e) {
            assert.isAbove(e.message.search('must be within challenge'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should finalize auction successfully', async () => {
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);
        const receipt = await liba.finalizeAuction(auctionId);
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'FinalizeAuction');
        assert.deepEqual(args.auctionId.toNumber(), auctionId);
    });

    it('should repay auction successfully', async () => {
        const value = BID1.value + (BID1.value * BID0.rate) / 100;
        const receipt = await liba.repayAuction(auctionId, { value });
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'RepayAuction');
        assert.deepEqual(args.auctionId.toNumber(), auctionId);
        const balance = await borrowToken.balanceOf(provider);
        assert.equal(balance.toString(), '300000000000000000000000');
    });

    it('should run ERC20 auction successfully', async () => {
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);
        await borrowToken.transfer(bidder1, 10000);
        await borrowToken.transfer(bidder2, 10000);
        await borrowToken.approve(polc.address, 10000, {
            from: bidder1
        });
        await borrowToken.approve(polc.address, 10000, {
            from: bidder2
        });
        const receipt = await liba.initAuction(
            borrowToken.address,
            6,
            2,
            1,
            1,
            1,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE,
            utils.EMPTY_ADDRESS,
            0
        );
        const { args } = receipt.logs[0];
        auctionId = args.auctionId.toNumber();
        libaHelper.setAuctionId(auctionId);

        await libaHelper.commitFund(BID0, bidder1, borrowToken.address);
        await libaHelper.commitFund(BID1, bidder2, borrowToken.address);
        await libaHelper.placeBid(BID0, bidder1, 'NewBid');
        await libaHelper.placeBid(BID1, bidder2, 'NewBid');
        await libaHelper.revealBid(BID1, bidder2);
        await libaHelper.revealBid(BID0, bidder1);
        await liba.claimWinners(auctionId, [bidder2], bidder1);
        await borrowToken.approve(liba.address, 10000);
        await liba.finalizeAuction(auctionId);
        const balance = await borrowToken.balanceOf(provider);
        assert.equal(balance.toString(), '299999999999999999980100');
        await borrowToken.approve(polc.address, 10000);
        await liba.repayAuction(auctionId);
        await liba.finalizeBid(auctionId, {
            from: bidder1
        });
    });

    it('should fail to collect collateral for not ended lending duration', async () => {
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);

        const receipt = await liba.initAuction(
            utils.EMPTY_ADDRESS,
            2,
            2,
            1,
            1,
            1,
            VALUE,
            1,
            MAX_RATE,
            MIN_VALUE,
            borrowToken.address,
            VALUE
        );
        const { args } = receipt.logs[0];
        auctionId = args.auctionId.toNumber();
        libaHelper.setAuctionId(auctionId);

        await libaHelper.placeBid(BID0, bidder1, 'NewBid');
        await libaHelper.commitFund(BID0, bidder1);
        await libaHelper.revealBid(BID0, bidder1);
        await liba.claimWinners(auctionId, [bidder1], bidder1);
        await borrowToken.approve(liba.address, 10000);
        await liba.finalizeAuction(auctionId);

        try {
            await liba.collectCollateral(auctionId, {
                from: bidder1
            });
        } catch (e) {
            assert.isAbove(
                e.message.search('must pass auction lending duration'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to collect collateral for non winner', async () => {
        await utils.updateTimestamp(DURATION * utils.DAY);
        try {
            await liba.collectCollateral(auctionId, {
                from: bidder2
            });
        } catch (e) {
            assert.isAbove(e.message.search('sender must be a winner'), -1);
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should collect collateral successfully', async () => {
        const receipt = await liba.collectCollateral(auctionId, {
            from: bidder1
        });
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'CollectCollateral');
        assert.equal(args.winner, bidder1);
    });

    it('should fail to collect collateral for repeated collect', async () => {
        try {
            await liba.collectCollateral(auctionId, {
                from: bidder1
            });
        } catch (e) {
            assert.isAbove(
                e.message.search('bid value must be larger than zero'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should transfer feeDeposit successfully', async () => {
        const receipt = await liba.transferFeeDeposit(auctionId);
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'TransferFeeDeposit');
        assert.equal(args.auctionId, auctionId);
    });

    it('should fail to init auction for missing from whitelist', async () => {
        liba = await LiBA.new(celerToken.address, polc.address, true, 10);
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);

        try {
            await liba.initAuction(
                utils.EMPTY_ADDRESS,
                BID_DURATION,
                REVEAL_DURATION,
                CLAIM_DURATION,
                CHALLENGE_DURATION,
                FINALIZE_DURATION,
                VALUE,
                DURATION,
                MAX_RATE,
                MIN_VALUE,
                utils.EMPTY_ADDRESS,
                0
            );
        } catch (e) {
            assert.isAbove(
                e.message.search(
                    'WhitelistedRole: caller does not have the Whitelisted role'
                ),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should init auction successfully if in whitelist', async () => {
        await liba.addWhitelisted(provider);
        await liba.initAuction(
            utils.EMPTY_ADDRESS,
            BID_DURATION,
            REVEAL_DURATION,
            CLAIM_DURATION,
            CHALLENGE_DURATION,
            FINALIZE_DURATION,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE,
            utils.EMPTY_ADDRESS,
            0
        );
    });

    it('should fail to initAuction for pauced contract', async () => {
        await liba.pause();
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);

        try {
            await liba.initAuction(
                utils.EMPTY_ADDRESS,
                BID_DURATION,
                REVEAL_DURATION,
                CLAIM_DURATION,
                CHALLENGE_DURATION,
                FINALIZE_DURATION,
                VALUE,
                DURATION,
                MAX_RATE,
                MIN_VALUE,
                utils.EMPTY_ADDRESS,
                0
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

    it('should initAuction successfully for unpauced contract', async () => {
        await liba.unpause();
        await liba.initAuction(
            utils.EMPTY_ADDRESS,
            BID_DURATION,
            REVEAL_DURATION,
            CLAIM_DURATION,
            CHALLENGE_DURATION,
            FINALIZE_DURATION,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE,
            utils.EMPTY_ADDRESS,
            0
        );
    });
});
