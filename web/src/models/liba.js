export default {
    namespace: 'LiBA',

    state: {},

    effects: {},

    reducers: {
        save(state, action) {
            return { ...state, ...action.payload };
        }
    }
};
