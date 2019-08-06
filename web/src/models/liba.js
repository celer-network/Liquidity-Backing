export default {
    namespace: 'LiBA',

    state: {},

    effects: {},

    reducers: {
        addBid(state, action) {
            return {
                ...state,
                bids: [...(state.bids || []), action.payload.auctionId]
            };
        },

        save(state, action) {
            return { ...state, ...action.payload };
        }
    }
};
