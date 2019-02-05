export default {
    namespace: 'PoLC',

    state: {},

    effects: {
        *fetchCommitments({ payload }, { call, put }) {
            const { commitmentId, user, PoLC } = payload;
            PoLC.methods.commitmentsByUser.cacheCall(user, commitmentId);
        }
    },

    reducers: {
        save(state, action) {
            return { ...state, ...action.payload };
        }
    }
};
