const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const PoLC = artifacts.require('PoLC');
const LiBA = artifacts.require('LiBA');

let polc;

module.exports = function(deployer, network, accounts) {
    return deployer
        .deploy(ERC20ExampleToken)
        .then(() => {
            return ERC20ExampleToken.deployed();
        })
        .then(token => {
            if (network === 'development') {
                token.transfer(accounts[1], '100000000000000000000000');
            }
        })
        .then(() => {
            return deployer.deploy(PoLC, ERC20ExampleToken.address, 100);
        })
        .then(p => {
            polc = p;
            return deployer.deploy(
                LiBA,
                ERC20ExampleToken.address,
                PoLC.address,
                false
            );
        })
        .then(() => {
            polc.setLibaAddress(LiBA.address);
        });
};
