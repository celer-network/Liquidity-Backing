export default {
    namespace: 'LiBA',

    state: {},

    effects: {
        *fetchAuction({ payload }, { call, put }) {
            const { auctionId, LiBA } = payload;
            LiBA.methods.getAuction.cacheCall(auctionId);
        }
    },

    reducers: {
        save(state, action) {
            return { ...state, ...action.payload };
        }
    }
};
