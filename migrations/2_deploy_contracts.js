const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const PoLC = artifacts.require('PoLC');
const LiBA = artifacts.require('LiBA');
const EthPool = artifacts.require('EthPool');

module.exports = function(deployer, network, accounts) {
    deployer.deploy(EthPool);

    return deployer
        .deploy(ERC20ExampleToken)
        .then(() => {
            return ERC20ExampleToken.deployed();
        })
        .then(token => {
            token.transfer(accounts[0], 10000000);
        })
        .then(() => {
            return deployer
                .deploy(PoLC, ERC20ExampleToken.address, 100)
                .then(() => {
                    return deployer.deploy(
                        LiBA,
                        ERC20ExampleToken.address,
                        PoLC.address,
                        100,
                        false
                    );
                });
        });
};
