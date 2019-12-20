const CELRToken = artifacts.require('CELRToken');
const DAIToken = artifacts.require('DAIToken');
const PoLC = artifacts.require('PoLC');
const LiBA = artifacts.require('LiBA');
const LiBAStruct = artifacts.require('LiBAStruct');
const LiBAAsker = artifacts.require('LiBAAsker');
const LiBABidder = artifacts.require('LiBABidder');

let polc;

module.exports = function(deployer, network, accounts) {
    return deployer
        .deploy(CELRToken)
        .then(() => {
            return CELRToken.deployed();
        })
        .then(token => {
            if (network === 'development') {
                token.transfer(accounts[1], '100000000000000000000000');
            }
        })
        .then(() => {
            return deployer.deploy(DAIToken);
        })
        .then(() => {
            return DAIToken.deployed();
        })
        .then(token => {
            if (network === 'development') {
                token.transfer(accounts[1], '100000000000000000000000');
            }
        })
        .then(() => {
            return deployer.deploy(PoLC, CELRToken.address, 100);
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
                CELRToken.address,
                PoLC.address,
                false,
                10
            );
        })
        .then(() => {
            return polc.setLibaAddress(LiBA.address);
        });
};
