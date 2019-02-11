import _ from 'lodash';

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

    return CHALLENGE;
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
