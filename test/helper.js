const utils = require('./utils');
const chai = require('chai');

const assert = chai.assert;

module.exports.LiBAHelper = class LiBAHelper {
    constructor(polc, liba, celerToken) {
        this.polc = polc;
        this.liba = liba;
        this.celerToken = celerToken;
    }

    setAuctionId(auctionId) {
        this.auctionId = auctionId;
    }

    async placeBid(bid, bidder, eventName) {
        await this.celerToken.approve(this.liba.address, bid.celerValue, {
            from: bidder
        });
        const receipt = await this.liba.placeBid(
            this.auctionId,
            bid.hash,
            bid.celerValue,
            {
                from: bidder
            }
        );
        const { event, args } = receipt.logs[0];
        assert.equal(event, eventName);
        assert.equal(args.auctionId.toNumber(), this.auctionId);
        assert.equal(args.bidder, bidder);

        const userBid = await this.liba.bidsByUser.call(bidder, this.auctionId);
        assert.equal(userBid.hash, bid.hash);
        assert.equal(userBid.celerValue.toNumber(), bid.celerValue);
    }

    async commitFund(bid, bidder, tokenAddress = utils.EMPTY_ADDRESS) {
        const isEmptyAddress = tokenAddress === utils.EMPTY_ADDRESS;
        const receipt = await this.polc.commitFund(tokenAddress, 1, bid.value, {
            value: isEmptyAddress ? bid.value : 0,
            from: bidder
        });
        const { args } = receipt.logs[0];
        bid.commitmentId = args.commitmentId.toNumber();
    }

    async revealBid(bid, bidder) {
        const { rate, value, celerValue, salt, commitmentId } = bid;
        const receipt = await this.liba.revealBid(
            this.auctionId,
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
        assert.equal(args.auctionId.toNumber(), this.auctionId);
        assert.equal(args.bidder, bidder);

        const userBid = await this.liba.bidsByUser.call(bidder, this.auctionId);
        assert.equal(
            userBid.hash,
            '0x0000000000000000000000000000000000000000000000000000000000000000'
        );
        assert.equal(userBid.rate.toNumber(), rate);
        assert.equal(userBid.value.toNumber(), value);
        assert.equal(userBid.celerValue.toNumber(), celerValue);
    }
};
