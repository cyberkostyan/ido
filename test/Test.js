var chai = require("chai");
var expect = chai.expect;

var MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
var Token = artifacts.require("./Token.sol");

contract('Test', function(accounts) {
  var multiSigWallet;
  var token;
  var incorrectCallerAddress = accounts[8];
  var neededConfirmationAmount = 2;

  async function deploy() {
    multiSigWallet = await  MultiSigWallet.new([accounts[0], accounts[1], accounts[2]], neededConfirmationAmount);
    token = await Token.new(multiSigWallet.address, accounts[0]);
	//ad = await multiSigWallet.token.call();
	//console.log('token address in multisig is set to: ', ad)
  }

  function toArray(object)  {
    var newArray = [];
    var i = 0;
    object.forEach(function (v) {
      newArray[i] = v.toNumber();
      i++;
    });
    return newArray;
  }

  describe("Deployment", async function() {
    beforeEach(deploy);
	console.log('before incorrect caller')
	//ad = await multiSigWallet.token.call();
	//console.log(ad)
    it("Incorrect (not multisig owner) call of setToken results in fail.", async function () {
      try {
        await multiSigWallet.setToken(token.address, {from: accounts[1]});
	  } catch (e) {
	    tokenAddress = await multiSigWallet.token.call();
		return assert.equal(tokenAddress, "0x0000000000000000000000000000000000000000", "Incorrect call of setToken changes token in multisig");
      }
      throw new Error();
    });

    it("Call setToken with account equal to owner should succeed", async function() {
      await multiSigWallet.setToken(token.address, {from: accounts[0]});
	    tokenAddress = await multiSigWallet.token.call();
		assert.equal(tokenAddress, token.address, "Correct call of setToken doesn't change token in multisig");
    });
  });

  describe("Setting tge", function() {
    beforeEach(async function () {
      await deploy();
      await multiSigWallet.setToken(token.address, {from: accounts[0]});
    });

    it("Correct caller of setToken results in setting token in multisig contract.", async function() {
      try {
        await multiSigWallet.tgeSettingsChangeRequest(100, 10, 89, 1, 2, 2, 10, {from: incorrectCallerAddress});
      } catch (e) {
        return true;
      }
      throw new Error();
    });

    it("Correct caller of tgeSettingsChangeRequest results in storing settings request.", async function() {
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(100, 10, 89, 1, 2, 2, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(100, 10, 89, 1, 2, 2, 10, {from: accounts[0]});
      var settingRequest = await multiSigWallet.viewSettingsChange.call(index, {from: accounts[0]});
      expect(toArray(settingRequest)).to.deep.equal([100, 10, 89, 1, 2, 2, 10]);
    });

    it("Incorrect caller of confirmSettingsChange results in fail.", async function() {
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(100, 10, 89, 1, 2, 2, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(100, 10, 89, 1, 2, 2, 10, {from: accounts[0]});
      try {
        await multiSigWallet.confirmSettingsChange.call(index, {from: incorrectCallerAddress});
      } catch (e) {
        return true
      }
      throw new Error();
    });

    it("Correct caller of confirmSettingsChange results in incrementing number of confirmations of a request.", async function() {
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(100, 10, 89, 1, 2, 2, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(100, 10, 89, 1, 2, 2, 10, {from: accounts[0]});
      var initialCount = await multiSigWallet.getSettingChangeConfirmationCount.call(index);
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      var finalCount = await multiSigWallet.getSettingChangeConfirmationCount.call(index);
      assert(finalCount > initialCount);
    });

    it("Invoking change request with zero parameters results in fail.", async function() {
      try {
        await multiSigWallet.tgeSettingsChangeRequest({from: accounts[0]});
      } catch (e) {
        return true;
      }
      throw new Error();
    });

    it("Reaching needed amount of confirmations results in changing tge settings in token contract.", async function() {
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(100, 10, 89, 1, 2, 2, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(100, 10, 89, 1, 2, 2, 10, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});

      var tgeSettingsAmount = await token.tgeSettingsAmount.call();
      var tgeSettingsPartInvestor = await token.tgeSettingsPartInvestor.call();
      var tgeSettingsPartProject = await token.tgeSettingsPartProject.call();
      var tgeSettingsPartFounders = await token.tgeSettingsPartFounders.call();
      var tgeSettingsBlocksPerStage = await token.tgeSettingsBlocksPerStage.call();
      var tgeSettingsPartInvestorIncreasePerStage = await token.tgeSettingsPartInvestorIncreasePerStage.call();
      var tgeSettingsMaxStages = await token.tgeSettingsMaxStages.call();

      assert.equal(tgeSettingsAmount, 100);
      assert.equal(tgeSettingsPartInvestor, 10);
      assert.equal(tgeSettingsPartProject, 89);
      assert.equal(tgeSettingsPartFounders, 1);
      assert.equal(tgeSettingsBlocksPerStage, 2);
      assert.equal(tgeSettingsPartInvestorIncreasePerStage, 2);
      assert.equal(tgeSettingsMaxStages, 10);
    });
  });

  describe("Setting tge", function() {
    beforeEach(async function () {
      await deploy();
      await multiSigWallet.setToken(token.address, {from: accounts[0]});
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(1000, 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(1000, 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});
    });

    it("Incorrect caller of setLiveTx results in fail.", async function() {
      try {
        await multiSigWallet.setLiveTx(multiSigWallet.address, {from: incorrectCallerAddress});
      } catch (e) {
        return true;
      }
      throw new Error();
    });

    it("Sending Ether when tge is NOT live results in fail.", async function() {
      try {
        web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 10 })
      } catch (e) {
        return true;
      }
      throw new Error();
    });

    it("Correct caller of setLiveTx results in setting tge live.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      var isLive = await token.tgeLive.call();
      assert(isLive);
    });

    it("Sending Ether when tge is live results in correct token distribution.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });
      var balance = await token.balanceOf.call(accounts[3], {from: accounts[3] });
      assert.equal(balance.toNumber(), 19);
    });

    it("Token transfer to zero address results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });
      try {
        await token.transfer(0x0, 5, {from: accounts[3]});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("Token transfer to token address results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });
      try {
        await token.transfer(token, 5, {from: accounts[3]});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("Calling token transfer to a nonzero and not token addresses results in correct token transfer.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });
      await token.transfer(accounts[4], 5, {from: accounts[3]});
      var balanceAccount3 = await token.balanceOf.call(accounts[3], {from: accounts[3] });
      var balanceAccount4 = await token.balanceOf.call(accounts[4], {from: accounts[4] });
      assert.equal(balanceAccount3.toNumber(), 14);
      assert.equal(balanceAccount4.toNumber(), 5);
    });

    const mineOneBlock = async () => {
      await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
        id: 0
      });
    };

    const mineNBlocks = async n => {
      for (let i = 0; i < n; i++) {
        await mineOneBlock();
      }
    };

    it("Waiting needed amount of blocks results in new correct token partition.", async function() {
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(100000, 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(100000, 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});

      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 9500, gas:3000000 });
      await mineNBlocks(20);
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 7300, gas:3000000 });
      var balance = await token.balanceOf.call(accounts[3], {from: accounts[3] });
      assert.equal(balance.toNumber(), 1900+2434);
    });

    it("Sending too much Ether results in returning back to sender the difference between goal tgeSettingsAmount and sent amount.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var beforeBalance = web3.eth.getBalance(web3.eth.accounts[3]);
      var gas = web3.eth.estimateGas({ from: accounts[3], to: token.address, value: 3000});
      var transaction = await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 3000, gas:3000000 });
      var afterBalance = await web3.eth.getBalance(web3.eth.accounts[3]);

      var totalSpend = beforeBalance.sub(afterBalance);
      assert.equal(totalSpend, gas+1000); // Total spend should be equal to the gas of transaction plus the token maximus amount
    });

    it("Fullfiling target amount results in tge finish (=not live).", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var transaction = await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 3000, gas:3000000 });

      var isLive = await token.tgeLive.call();
      assert(!isLive);
    });

    it("Correct caller of setFinishedTx when tge is live results in tge finish.", async function() {
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(web3.toWei(1000, "ether"), 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(web3.toWei(1000, "ether"), 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});

      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var isLive = await token.tgeLive.call();
      assert(isLive);

      var transaction = await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: web3.toWei(10, "ether"), gas:3000000 });

      transactionId = await multiSigWallet.setFinishedTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setFinishedTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var isLive = await token.tgeLive.call();
      assert(!isLive);
    });

    it("Incorrect caller of setFinishedTx when tge is live results in fail.", async function() {
      try {
        await multiSigWallet.setFinishedTx(multiSigWallet.address, {from: incorrectCallerAddress});
      } catch (e) {
        return true;
      }
      throw new Error();
    });

    it("Call of setFinishedTx when tge is not live results in fail.", async function() {
      var transactionId = await multiSigWallet.setFinishedTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setFinishedTx(token.address, {from: accounts[0]});
      multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]}).then(function(e){
        assert.equal("ExecutionFailure", e["logs"][1]["event"]);
      });
    });

    it("Changing settings when tge is live results with no changes.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var index = await multiSigWallet.tgeSettingsChangeRequest.call(100, 10, 89, 1, 2, 2, 5, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(100, 10, 89, 1, 2, 2, 5, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});

      var tgeSettingsAmount = await token.tgeSettingsAmount.call();
      var tgeSettingsPartInvestor = await token.tgeSettingsPartInvestor.call();
      var tgeSettingsPartProject = await token.tgeSettingsPartProject.call();
      var tgeSettingsPartFounders = await token.tgeSettingsPartFounders.call();
      var tgeSettingsBlocksPerStage = await token.tgeSettingsBlocksPerStage.call();
      var tgeSettingsPartInvestorIncreasePerStage = await token.tgeSettingsPartInvestorIncreasePerStage.call();
      var tgeSettingsMaxStages = await token.tgeSettingsMaxStages.call();

      assert.equal(tgeSettingsAmount.toNumber(), 1000);
      assert.equal(tgeSettingsPartInvestor.toNumber(), 25);
      assert.equal(tgeSettingsPartProject.toNumber(), 50);
      assert.equal(tgeSettingsPartFounders.toNumber(), 50);
      assert.equal(tgeSettingsBlocksPerStage.toNumber(), 20);
      assert.equal(tgeSettingsPartInvestorIncreasePerStage.toNumber(), 25);
      assert.equal(tgeSettingsMaxStages.toNumber(), 10);
    });
  });

  describe("Freeze", function() {
    beforeEach(async function () {
      await deploy();
      await multiSigWallet.setToken(token.address, {from: accounts[0]});
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(web3.toWei(1000, "ether"), 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(web3.toWei(1000, "ether"), 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});
    });

    it("Correct caller of goLiveTx results in freeze.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var transactionId = await multiSigWallet.goLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.goLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var isFrozen = await token.isFrozen.call();
      assert(isFrozen);
    });

    it("Incorrect caller of goLiveTx results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      try {
        await multiSigWallet.goLiveTx(token.address, {from: incorrectCallerAddress});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("When frozen, token transfer calls result in false.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });

      var transactionId = await multiSigWallet.goLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.goLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      try {
        await token.transfer(accounts[4], 5, {from: accounts[3]});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("When frozen, transferFrom calls result in false.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });

      var transactionId = await multiSigWallet.goLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.goLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      try {
        await token.approve(accounts[5], 5, {from: accounts[3]});
        await token.transferFrom(accounts[3], accounts[4], 5, {from: accounts[5]});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("When NOT frozen, withdrawFrozen call results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });

      try {
        await token.withdrawFrozen({from: accounts[3]});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("When frozen, withdrawFrozen call results in correct Ether transfer.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: web3.toWei(8, "ether"), gas:3000000 });
      var beforeBalance = await web3.eth.getBalance(web3.eth.accounts[3]);

      transactionId = await multiSigWallet.goLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.goLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var gas = await token.withdrawFrozen.estimateGas({from: accounts[3]});
      await token.withdrawFrozen({from: accounts[3]});
      var afterBalance = await web3.eth.getBalance(web3.eth.accounts[3]);
      var tokenBalance = await token.balanceOf.call(accounts[3], {from: accounts[3] });

      var expectedBalance = web3.fromWei(beforeBalance.sub(web3.toWei(gas/10, "szabo")).add(tokenBalance));
      assert.equal(expectedBalance, web3.fromWei(afterBalance, "ether").toNumber());
    });

    it("When frozen, sending Ether to token contract results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var transactionId = await multiSigWallet.goLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.goLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      try {
        await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });
      } catch(e) {
        return true;
      }
      throw new Error();
    });
  });

  describe("Burn", function() {
    beforeEach(async function () {
      await deploy();
      await multiSigWallet.setToken(token.address, {from: accounts[0]});
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(web3.toWei(1000, "ether"), 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(web3.toWei(1000, "ether"), 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});
    });

    it("Calling burn when frozen results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: web3.toWei(10, "ether"), gas:3000000 });

      var transactionId = await multiSigWallet.goLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.goLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      try {
        await token.burn(1, {from: accounts[3]});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("Calling burn when NOT frozen results correct Ether transfer.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.setLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: web3.toWei(8, "ether"), gas:3000000 });
      var beforeBalance = await web3.eth.getBalance(web3.eth.accounts[3]);

      transactionId = await multiSigWallet.goLiveTx.call(token.address, {from: accounts[0]});
      await multiSigWallet.goLiveTx(token.address, {from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var gas = await token.burn.estimateGas(web3.toWei(1, "ether"), {from: accounts[3]});
      await token.burn(web3.toWei(1, "ether"), {from: accounts[3]});
      var afterBalance = await web3.eth.getBalance(web3.eth.accounts[3]);

      var expectedBalance = web3.fromWei(beforeBalance.sub(web3.toWei(gas/10, "szabo")).add(web3.toWei(1, "ether")));
      assert.equal(expectedBalance, web3.fromWei(afterBalance, "ether").toNumber());
    });
  });
});
