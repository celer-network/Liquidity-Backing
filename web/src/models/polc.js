export default {
    namespace: 'PoLC',

    state: {},

    effects: {},

    reducers: {
        save(state, action) {
            return { ...state, ...action.payload };
        }
    }
};
