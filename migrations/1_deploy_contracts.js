var MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
var Token = artifacts.require("./Token.sol");

module.exports = function(deployer, network, accounts) {
  var app = deployer.deploy(MultiSigWallet, [accounts[0], accounts[1], accounts[2]], 2).then(function() {
    return deployer.deploy(Token, MultiSigWallet.address, accounts[0]);
  });
};
