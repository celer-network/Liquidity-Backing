import PoLC from './../contracts/PoLC.json';

// let drizzle know what contracts we want
const contractOptions = {
    web3: {
        block: false,
        fallback: {
            type: 'ws',
            url: 'ws://localhost:8545'
        }
    },
    contracts: [PoLC]
};

export default contractOptions;
