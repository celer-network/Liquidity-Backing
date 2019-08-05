import _ from 'lodash';

export const BID = 'Bid';
export const REVEAL = 'Reveal';
export const CLAIM = 'Claim';
export const CHALLENGE = 'Challenge';
export const FINALIZE = 'Finalize';

export const getCurrentPeriod = (blockNumber, auction, auctionPeriods) => {
    const auctionPeriod = _.find(
        auctionPeriods,
        auctionPeriod => auctionPeriod.args[0] === auction.args[0]
    );

    const { bidEnd, revealEnd, claimEnd, challengeEnd, finalizeEnd } = _.get(
        auctionPeriod,
        'value',
        {}
    );

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

    return 'Unknown';
};

const compareBid = (bid1, bid2) => {
    const { rate1, celerValue1 } = bid1.value;
    const { rate2, celerValue2 } = bid2.value;

    if (rate1 !== rate2) {
        return rate1 - rate2;
    }

    return celerValue2 - celerValue1;
};

export const getWinners = (auction, bids) => {
    const result = [];
    let remainingValue = auction.value.value;
    bids.sort(compareBid);

    _.forEach(bids, bid => {
        const bidder = bid.args[0];
        const { value } = bid.value;

        remainingValue -= value;
        result.push(bidder);

        if (remainingValue < 0) {
            return false;
        }
    });

    return result;
};
