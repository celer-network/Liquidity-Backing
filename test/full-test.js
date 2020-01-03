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
const MIN_CELER = 10;
const VALUE = 600;
const DURATION = 2;
const MAX_RATE = 10;
const MIN_VALUE = 2;
const BID = {
    rate: 5,
    value: VALUE / 6,
    celerValue: 1000,
    salt: 100,
    commitmentId: 0
};

contract(
    'Comprehensive LiBA test',
    ([asker, bidder0, bidder1, bidder2, bidder3, bidder4]) => {
        let celerToken;
        let liba;
        let polc;
        let auctionId;
        let libaHelper;
        const bids = {};

        before(async () => {
            celerToken = await ERC20ExampleToken.new();
            polc = await PoLC.new(celerToken.address, 1);

            const libaStruct = await LiBAStruct.new();
            await LiBAAsker.link('LiBAStruct', libaStruct.address);
            const libaAsker = await LiBAAsker.new();
            await LiBABidder.link('LiBAStruct', libaStruct.address);
            const libaBidder = await LiBABidder.new();

            await LiBA.link('LiBAStruct', libaStruct.address);
            await LiBA.link('LiBAAsker', libaAsker.address);
            await LiBA.link('LiBABidder', libaBidder.address);
            liba = await LiBA.new(
                celerToken.address,
                polc.address,
                false,
                MIN_CELER
            );

            await polc.setLibaAddress(liba.address);
            await celerToken.transfer(bidder0, 10000);
            await celerToken.transfer(bidder1, 10000);
            await celerToken.transfer(bidder2, 10000);
            await celerToken.transfer(bidder3, 10000);
            await celerToken.transfer(bidder4, 10000);

            libaHelper = new helper.LiBAHelper(polc, liba, celerToken);
            utils.calculateBidHash(BID);
            for (const bidder of [
                bidder0,
                bidder1,
                bidder2,
                bidder3,
                bidder4
            ]) {
                bids[bidder] = { ...BID };
            }
        });

        it('less bid value than asked auction value', async () => {
            const receipt = await liba.initAuction(
                utils.EMPTY_ADDRESS,
                10, // BID_DURATION
                10, // REVEAL_DURATION
                1, // CLAIM_DURATION
                1, // CHALLENGE_DURATION
                1, // FINALIZE_DURATION
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

            const winners = [bidder0, bidder1, bidder2, bidder3, bidder4];
            for (const winner of winners) {
                await libaHelper.placeBid(bids[winner], winner, 'NewBid');
            }

            for (const winner of winners) {
                await libaHelper.commitFund(bids[winner], winner);
                await libaHelper.revealBid(bids[winner], winner);
            }

            await liba.claimWinners(auctionId, winners, bidder4, {
                from: asker
            });
            await celerToken.approve(liba.address, AUCTION_DEPOSIT);
            await liba.finalizeAuction(auctionId);

            await utils.updateTimestamp(DURATION * utils.DAY);
            const value =
                5 * BID.value + (5 * DURATION * BID.value * BID.rate) / 1000;
            await liba.repayAuction(auctionId, { value });

            for (const winner of winners) {
                const balance = await liba.payments(winner);
                assert.equal(balance.toNumber(), 1);
            }

            for (const winner of winners) {
                const commitment = await polc.commitmentsByUser(
                    winner,
                    bids[winner].commitmentId
                );
                assert.equal(commitment.availableValue, 100);
            }
        });

        it('less bid value than asked auction value with unrevealed bid', async () => {
            const receipt = await liba.initAuction(
                utils.EMPTY_ADDRESS,
                10, // BID_DURATION
                8, // REVEAL_DURATION
                1, // CLAIM_DURATION
                1, // CHALLENGE_DURATION
                1, // FINALIZE_DURATION
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

            for (const bidder of [
                bidder0,
                bidder1,
                bidder2,
                bidder3,
                bidder4
            ]) {
                await libaHelper.placeBid(bids[bidder], bidder, 'NewBid');
            }

            const winners = [bidder0, bidder1, bidder2, bidder3];
            for (const winner of winners) {
                await libaHelper.commitFund(bids[winner], winner);
                await libaHelper.revealBid(bids[winner], winner);
            }

            await liba.claimWinners(auctionId, winners, bidder3, {
                from: asker
            });
            await celerToken.approve(liba.address, AUCTION_DEPOSIT);
            await liba.finalizeAuction(auctionId);

            await utils.updateTimestamp(DURATION * utils.DAY);
            const value =
                4 * BID.value + (4 * DURATION * BID.value * BID.rate) / 1000;
            await liba.repayAuction(auctionId, { value });

            for (const winner of winners) {
                const balance = await liba.payments(winner);
                assert.equal(balance.toNumber(), 2);
            }

            for (const winner of winners) {
                const commitment = await polc.commitmentsByUser(
                    winner,
                    bids[winner].commitmentId
                );
                assert.equal(commitment.availableValue, 100);
            }
        });

        it('more bid value than asked auction value', async () => {
            bids[bidder3].value = 200;
            utils.calculateBidHash(bids[bidder3]);
            bids[bidder4].rate = 10;
            utils.calculateBidHash(bids[bidder4]);

            const receipt = await liba.initAuction(
                utils.EMPTY_ADDRESS,
                10, // BID_DURATION
                10, // REVEAL_DURATION
                1, // CLAIM_DURATION
                1, // CHALLENGE_DURATION
                1, // FINALIZE_DURATION
                400,
                DURATION,
                MAX_RATE,
                MIN_VALUE,
                utils.EMPTY_ADDRESS,
                0
            );

            const { args } = receipt.logs[0];
            auctionId = args.auctionId.toNumber();
            libaHelper.setAuctionId(auctionId);

            const bidders = [bidder0, bidder1, bidder2, bidder3, bidder4];
            for (const bidder of bidders) {
                await libaHelper.placeBid(bids[bidder], bidder, 'NewBid');
            }

            for (const bidder of bidders) {
                await libaHelper.commitFund(bids[bidder], bidder);
                await libaHelper.revealBid(bids[bidder], bidder);
            }

            const winners = [bidder0, bidder1, bidder2, bidder3];
            const topLoser = bidder4;
            await liba.claimWinners(auctionId, winners, topLoser, {
                from: asker
            });
            await celerToken.approve(liba.address, AUCTION_DEPOSIT);
            await liba.finalizeAuction(auctionId);

            const commitment = await polc.commitmentsByUser(
                bidder3,
                bids[bidder3].commitmentId
            );
            assert.equal(commitment.availableValue, 100);

            await utils.updateTimestamp(DURATION * utils.DAY);
            const value =
                4 * BID.value +
                (4 * DURATION * BID.value * bids[topLoser].rate) / 1000;
            await liba.repayAuction(auctionId, { value });

            for (const winner of winners) {
                const balance = await liba.payments(winner);
                assert.equal(balance.toNumber(), 4);
            }

            for (const winner of winners) {
                const commitment = await polc.commitmentsByUser(
                    winner,
                    bids[winner].commitmentId
                );

                if (winner === bidder3) {
                    assert.equal(commitment.availableValue, 200);
                } else {
                    assert.equal(commitment.availableValue, 100);
                }
            }
        });
    }
);
