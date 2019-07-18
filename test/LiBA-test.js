const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Web3 = require('web3');

const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const LiBA = artifacts.require('LiBA');
const PoLC = artifacts.require('PoLC');

chai.use(chaiAsPromised);
const assert = chai.assert;
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
const AUCTION_DEPOSIT = 100;
const BID_DURATION = 8;
const REVEAL_DURATION = 10;
const CLAIM_DURATION = 2;
const CHALLENGE_DURATION = 2;
const FINALIZE_DURATION = 2;
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

const calculateBidHash = bid => {
    const { rate, value, celerValue, salt } = bid;
    bid.hash = web3.utils.soliditySha3(rate, value, celerValue, salt);
};

calculateBidHash(BID0);
calculateBidHash(BID1);

contract('LiBA', ([provider, bidder0, bidder1, bidder2]) => {
    let celerToken;
    let borrowToken;
    let liba;
    let polc;
    let auctionId;

    const placeBid = async (bid, bidder, eventName) => {
        await celerToken.approve(liba.address, bid.celerValue, {
            from: bidder
        });
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

    const commitFund = async (bid, bidder, tokenAddress = EMPTY_ADDRESS) => {
        const isEmptyAddress = tokenAddress === EMPTY_ADDRESS;
        const receipt = await polc.commitFund(tokenAddress, 100, bid.value, {
            value: isEmptyAddress ? bid.value : 0,
            from: bidder
        });
        const { args } = receipt.logs[0];
        bid.commitmentId = args.commitmentId.toNumber();
    };

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

    before(async () => {
        celerToken = await ERC20ExampleToken.new();
        borrowToken = await ERC20ExampleToken.new();
        polc = await PoLC.new(celerToken.address, AUCTION_DEPOSIT / 2);
        liba = await LiBA.new(celerToken.address, polc.address, false);

        await polc.setLibaAddress(liba.address);
        await liba.updateSupportedToken(borrowToken.address, true);
        await polc.updateSupportedToken(borrowToken.address, true);
        await celerToken.transfer(provider, 10000);
        await celerToken.transfer(bidder0, 10000);
        await celerToken.transfer(bidder1, 10000);
        await celerToken.transfer(bidder2, 10000);
    });

    it('should fail to init auction for missing auction deposit', async () => {
        try {
            await liba.initAuction(
                EMPTY_ADDRESS,
                BID_DURATION,
                REVEAL_DURATION,
                CLAIM_DURATION,
                CHALLENGE_DURATION,
                FINALIZE_DURATION,
                VALUE,
                DURATION,
                MAX_RATE,
                MIN_VALUE,
                EMPTY_ADDRESS,
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

    it('should init auction successfully', async () => {
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);
        await borrowToken.approve(liba.address, VALUE);
        const receipt = await liba.initAuction(
            EMPTY_ADDRESS,
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
    });

    it('should repay auction successfully', async () => {
        const value = BID1.value + (BID1.value * BID1.rate) / 100;
        const receipt = await liba.repayAuction(auctionId, { value });
        const { event, args } = receipt.logs[0];
        assert.equal(event, 'RepayAuction');
        assert.deepEqual(args.auctionId.toNumber(), auctionId);
        const balance = await borrowToken.balanceOf(provider);
        assert.equal(balance.toNumber(), 300000);
    });

    it('should init ERC20 auction successfully', async () => {
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);
        await borrowToken.transfer(bidder2, 10000);
        await borrowToken.approve(polc.address, 10000, {
            from: bidder2
        });
        const receipt = await liba.initAuction(
            borrowToken.address,
            2,
            2,
            1,
            1,
            1,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE,
            EMPTY_ADDRESS,
            0
        );
        const { args } = receipt.logs[0];
        auctionId = args.auctionId.toNumber();

        await placeBid(BID0, bidder2, 'NewBid');
        await commitFund(BID0, bidder2, borrowToken.address);
        await revealBid(BID0, bidder2);
        await liba.claimWinners(auctionId, [bidder2]);
        await borrowToken.approve(liba.address, 10000);
        await liba.finalizeAuction(auctionId);
        const balance = await borrowToken.balanceOf(provider);
        assert.equal(balance.toNumber(), 290100);
        await borrowToken.approve(polc.address, 10000);
        await liba.repayAuction(auctionId);
    });

    it('should fail to collect collateral for not ended lending duration', async () => {
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);

        const receipt = await liba.initAuction(
            EMPTY_ADDRESS,
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

        await placeBid(BID0, bidder1, 'NewBid');
        await commitFund(BID0, bidder1);
        await revealBid(BID0, bidder1);
        await liba.claimWinners(auctionId, [bidder1]);
        await borrowToken.approve(liba.address, 10000);
        await liba.finalizeAuction(auctionId);

        try {
            await liba.collectCollateral(auctionId, {
                from: bidder1
            });
        } catch (e) {
            assert.isAbove(
                e.message.search('must be pass auction lending duration'),
                -1
            );
            return;
        }

        assert.fail('should have thrown before');
    });

    it('should fail to collect collateral for non winner', async () => {
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

    it('should fail to init auction for missing from whitelist', async () => {
        liba = await LiBA.new(celerToken.address, polc.address, true);
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);

        try {
            await liba.initAuction(
                EMPTY_ADDRESS,
                BID_DURATION,
                REVEAL_DURATION,
                CLAIM_DURATION,
                CHALLENGE_DURATION,
                FINALIZE_DURATION,
                VALUE,
                DURATION,
                MAX_RATE,
                MIN_VALUE,
                EMPTY_ADDRESS,
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
            EMPTY_ADDRESS,
            BID_DURATION,
            REVEAL_DURATION,
            CLAIM_DURATION,
            CHALLENGE_DURATION,
            FINALIZE_DURATION,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE,
            EMPTY_ADDRESS,
            0
        );
    });

    it('should fail to initAuction for pauced contract', async () => {
        await liba.pause();
        await celerToken.approve(liba.address, AUCTION_DEPOSIT);

        try {
            await liba.initAuction(
                EMPTY_ADDRESS,
                BID_DURATION,
                REVEAL_DURATION,
                CLAIM_DURATION,
                CHALLENGE_DURATION,
                FINALIZE_DURATION,
                VALUE,
                DURATION,
                MAX_RATE,
                MIN_VALUE,
                EMPTY_ADDRESS,
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
            EMPTY_ADDRESS,
            BID_DURATION,
            REVEAL_DURATION,
            CLAIM_DURATION,
            CHALLENGE_DURATION,
            FINALIZE_DURATION,
            VALUE,
            DURATION,
            MAX_RATE,
            MIN_VALUE,
            EMPTY_ADDRESS,
            0
        );
    });
});
