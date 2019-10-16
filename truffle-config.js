require('dotenv').config();

const HDWalletProvider = require('truffle-hdwallet-provider');

const infuraProvider = network =>
    new HDWalletProvider(
        process.env.PRIVATEKEY ||
            '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
        `https://${network}.infura.io/v3/ce581be62b43483b8627f4f9f2ad40d6`
    );

const ropstenProvider = process.env.SOLIDITY_COVERAGE
    ? undefined
    : infuraProvider('ropsten');

module.exports = {
    compilers: {
        solc: {
            version: '0.5.12'
        }
    },
    contracts_build_directory: './web/src/contracts',
    networks: {
        development: {
            host: 'localhost',
            port: 8545,
            network_id: '*' // eslint-disable-line camelcase
        },
        ropsten: {
            provider: ropstenProvider,
            network_id: 3 // eslint-disable-line camelcase
        },
        coverage: {
            host: 'localhost',
            network_id: '*', // eslint-disable-line camelcase
            port: 8555,
            gas: 0xfffffffffff,
            gasPrice: 0x01
        },
        ganache: {
            host: 'localhost',
            port: 8545,
            network_id: '*' // eslint-disable-line camelcase
        }
    }
};
