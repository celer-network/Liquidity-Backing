import _ from 'lodash';
import web3 from 'web3';

const { BN } = web3.utils;

export const BID = 'Bid';
export const REVEAL = 'Reveal';
export const CLAIM = 'Claim';
export const CHALLENGE = 'Challenge';
export const FINALIZE = 'Finalize';
export const FINALIZED = 'Finalized';
export const EXPIRED = 'Expired';
export const UNKNOWN = 'Unknown';

export const getAuctionPeriod = (auctionPeriods, auction) => {
    return _.find(
        auctionPeriods,
        auctionPeriod => auctionPeriod.args[0] === auction.args[0]
    );
}

export const getCurrentPeriod = (auctionPeriod, blockNumber) => {
    const {
        bidEnd,
        revealEnd,
        claimEnd,
        challengeEnd,
        finalizeEnd,
        finalized
    } = _.get(auctionPeriod, 'value', {});

    if (blockNumber < _.toNumber(bidEnd)) {
        return BID;
    }

    if (blockNumber < _.toNumber(revealEnd)) {
        return REVEAL;
    }

    if (blockNumber < _.toNumber(claimEnd)) {
        return CLAIM;
    }

    if (blockNumber < _.toNumber(challengeEnd)) {
        return CHALLENGE;
    }

    if (blockNumber < _.toNumber(finalizeEnd)) {
        return FINALIZE;
    }

    if (finalized) {
        return FINALIZED;
    }

    return EXPIRED;
};

export const getWinners = (auction, bids) => {
    const winners = [];
    let topLoser;
    let remainingValue = auction.value.value;
    bids.sort(compareBid);

    _.forEach(bids, bid => {
        const [bidder] = bid.args;
        const { value } = bid.value;

        if (remainingValue < 0) {
            topLoser = bidder;
            return false;
        }

        remainingValue -= value;
        winners.push(bidder);
    });

    if (!topLoser) {
        topLoser = _.last(winners);
    }

    return { winners, topLoser };
};

export const calculateRepay = (bids, winners) => {
    let result = new BN(0);

    _.forEach(bids, bid => {
        const [bidder] = bid.args;
        const { value, rate } = bid.value;

        if (!_.includes(winners, bidder)) {
            return;
        }

        result = result.add(new BN(value).muln(100 + parseInt(rate)).divn(100));
        console.log(rate, result.toString());
    });

    return result;
};

const compareBid = (bid1, bid2) => {
    const { rate1, celerValue1 } = bid1.value;
    const { rate2, celerValue2 } = bid2.value;

    if (rate1 !== rate2) {
        return rate1 - rate2;
    }

    return celerValue2 - celerValue1;
};
