const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const PoLC = artifacts.require('PoLC');

module.exports = function(deployer) {
    deployer.deploy(ERC20ExampleToken).then(function() {
        return deployer.deploy(PoLC, ERC20ExampleToken.address, 100);
    });
};
