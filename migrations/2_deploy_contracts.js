const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const PoLC = artifacts.require('PoLC');
const LiBA = artifacts.require('LiBA');
const LiBAStruct = artifacts.require('LiBAStruct');
const LiBAAsker = artifacts.require('LiBAAsker');
const LiBABidder = artifacts.require('LiBABidder');

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

            return deployer.deploy(LiBAStruct);
        })
        .then(() => {
            deployer.link(LiBAStruct, LiBAAsker);
            return deployer.deploy(LiBAAsker);
        })
        .then(() => {
            deployer.link(LiBAStruct, LiBABidder);
            return deployer.deploy(LiBABidder);
        })
        .then(() => {
            deployer.link(LiBAStruct, LiBA);
            deployer.link(LiBAAsker, LiBA);
            deployer.link(LiBABidder, LiBA);
            return deployer.deploy(
                LiBA,
                ERC20ExampleToken.address,
                PoLC.address,
                false,
                10
            );
        })
        .then(() => {
            polc.setLibaAddress(LiBA.address);
        });
};
