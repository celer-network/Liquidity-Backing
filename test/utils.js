const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

module.exports.EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
module.exports.DAY = 60 * 60 * 24;

module.exports.calculateBidHash = bid => {
    const { rate, value, celerValue, salt } = bid;
    bid.hash = web3.utils.soliditySha3(rate, value, celerValue, salt);
};

module.exports.updateTimestamp = async function(timeIncreament) {
    await new Promise((resolve, reject) => {
        return web3.currentProvider.send(
            {
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [timeIncreament],
                id: 0
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });

    await new Promise((resolve, reject) => {
        return web3.currentProvider.send(
            { jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};
