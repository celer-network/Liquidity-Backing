import _ from 'lodash';
import web3 from 'web3';

export const BID = 'Bid';
export const REVEAL = 'Reveal';
export const CLAIM = 'Claim';
export const CHALLENGE = 'Challenge';
export const FINALIZE = 'Finalize';

export const getCurrentPeriod = (blockNumber, auction) => {
    const {
        bidEnd,
        revealEnd,
        claimEnd,
        challengeEnd,
        finalizeEnd
    } = auction.value;

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

const calculateScore = (bid, maxRate, maxFactor) => {
    const { rate, celerValue, value } = bid.value;
    const valueFactor =
        web3.utils.toWei(celerValue, 'ether') / value / maxFactor;
    const rateFactor = rate / maxRate;

    return valueFactor - rateFactor;
};

export const getWinners = (auction, bids) => {
    let maxRate = 0;
    let maxFactor = 0;

    _.forEach(bids, bid => {
        const { rate, celerValue, value } = bid.value;

        if (rate > maxRate) {
            maxRate = rate;
        }

        const factor = web3.utils.toWei(celerValue, 'ether') / value;
        if (factor > maxFactor) {
            maxFactor = factor;
        }
    });

    bids.sort((bid1, bid2) => calculateScore(bid2) - calculateScore(bid1));

    const result = [];
    let remainingValue = auction.value.value;

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
