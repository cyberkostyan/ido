var chai = require("chai"); var expect = chai.expect;

var MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
var Token = artifacts.require("./Token.sol");

contract('', function(accounts) {
  var multiSigWallet;
  var token;
  var incorrectCallerAddress = accounts[8];
  var neededConfirmationAmount = 2;

  async function deploy() {
    multiSigWallet = await  MultiSigWallet.new([accounts[0], accounts[1], accounts[2]], neededConfirmationAmount);
    token = await Token.new(multiSigWallet.address, accounts[0]);
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

    it("Incorrect caller of tgeSettingsChangeRequest results in fail.", async function() {
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
      var initialCount = await multiSigWallet.getSettingsChangeConfirmationCount.call(index.valueOf());
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});
      var finalCount = await multiSigWallet.getSettingsChangeConfirmationCount.call(index.valueOf());
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

  describe("tgeLive", function() {
      var tgeSettingsAmountOriginal = 10**16
    beforeEach(async function () {
      await deploy();
      await multiSigWallet.setToken(token.address, {from: accounts[0]});
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(tgeSettingsAmountOriginal, 25, 50, 50, 20, 25, 10, {from: accounts[0]});
        //var index = await multiSigWallet.tgeSettingsChangeRequest.call(1000, 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(tgeSettingsAmountOriginal, 25, 50, 50, 20, 25, 10, {from: accounts[0]});
        //await multiSigWallet.tgeSettingsChangeRequest(1000, 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});
    });

    it("Incorrect caller of setLiveTx results in fail.", async function() {
      try {
        await multiSigWallet.setLiveTx({from: incorrectCallerAddress});
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
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      var isLive = await token.tgeLive.call();
      assert(isLive);
    });

    it("Sending Ether when tge is live results in correct token distribution.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });
      var balance = await token.balanceOf.call(accounts[3], {from: accounts[3] });
      assert.equal(balance.toNumber(), 19);
    });

    it("Token transfer to zero address results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });
      try {
          await token.transfer(0x0, 5, {from: accounts[3]});
      } catch(e) {
          var balance = await token.balanceOf.call(0x0, {from: accounts[3] });
          return assert.equal(balance.valueOf(), 0, "Zero address has received tokens while it shouldn't be possible");
      }
      throw new Error();
    });

    it("Token transfer to token address results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });
      try {
        await token.transfer(token.address, 5, {from: accounts[3]});
      } catch(e) {
          var balance = await token.balanceOf.call(token.address, {from: accounts[3] });
          return assert.equal(balance.valueOf(), 0, "Token contract has received tokens while it shouldn't be possible");
      }
      throw new Error();
    });

    it("Calling token transfer to a nonzero and not token addresses results in correct token transfer.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
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

      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 9500, gas:3000000 });
      await mineNBlocks(20);
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 7300, gas:3000000 });
      var balance = await token.balanceOf.call(accounts[3], {from: accounts[3] });
      assert.equal(balance.toNumber(), 1900+2434);
    });

    it("Sending too much Ether results in returning back to sender the difference between goal tgeSettingsAmount and sent amount.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var valueToSend = 10**18;
      var beforeBalance = web3.eth.getBalance(web3.eth.accounts[3]);
      var gas = web3.eth.estimateGas({ from: accounts[3], to: token.address, value: valueToSend, data: ''});
      var transaction = await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: valueToSend, gas:3000000 });
      var afterBalance = await web3.eth.getBalance(web3.eth.accounts[3]);
      var totalSpend = beforeBalance.sub(afterBalance);
      assert.equal(totalSpend.valueOf(), gas+tgeSettingsAmountOriginal, 'Totalspend value is incorrect.'); // Total spend should be equal to the gas of transaction plus the token maximus amount
    });

    it("Sending Ether results in correct changes of tgeSettingsAmount and totalSupply.", async function() {
      //Here we initiate 2 transactions: one with low value (less than tgeSettingsAmount), another with high (greater than tgeSettingsAmount)
      //and check whether tgeSettingsAmount and totalSupply are correct after each of transactions.
      var firstValue = 0.3 * tgeSettingsAmountOriginal;
      var secondValue = 3 * tgeSettingsAmountOriginal;

      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var beforeAmountCollect = await token.tgeSettingsAmountCollect.call();
      var beforeTotalSupply = await token.totalSupply.call();

      var gas = web3.eth.estimateGas({ from: accounts[3], to: token.address, value: firstValue, data: ''});
      var transaction = await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: firstValue, gas:3000000 });

      var middleAmountCollect = await token.tgeSettingsAmountCollect.call();
      var middleTotalSupply = await token.totalSupply.call();

      assert.equal(middleTotalSupply, firstValue.valueOf(), 'Total supply after first transaction is incorrect');
      assert.equal(middleAmountCollect, firstValue.valueOf(), 'tgeSettingsAmountCollect after first transaction is incorrect');

      var gas2 = web3.eth.estimateGas({ from: accounts[5], to: token.address, value: secondValue, data: ''});
      var transaction2 = await web3.eth.sendTransaction({ from: accounts[5], to: token.address, value: secondValue, gas:3000000 });

      var afterAmountCollect = await token.tgeSettingsAmountCollect.call();
      var afterTotalSupply = await token.totalSupply.call();

      assert.equal(afterTotalSupply.valueOf(), tgeSettingsAmountOriginal, 'Total supply after second transaction is incorrect');
      assert.equal(afterAmountCollect.valueOf(), tgeSettingsAmountOriginal, 'tgeSettingsAmountCollect after second transaction is incorrect');
    });

    it("Fullfiling target amount results in tge finish (=not live).", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var transaction = await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: tgeSettingsAmountOriginal, gas:3000000 });

      var isLive = await token.tgeLive.call();
      assert(!isLive);
    });

    it("Correct caller of setFinishedTx when tge is live results in tge finish.", async function() {
      var index = await multiSigWallet.tgeSettingsChangeRequest.call(web3.toWei(1000, "ether"), 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(web3.toWei(1000, "ether"), 25, 50, 50, 20, 25, 10, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});

      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var isLive = await token.tgeLive.call();
      assert(isLive);

      var transaction = await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: web3.toWei(10, "ether"), gas:3000000 });

      transactionId = await multiSigWallet.setFinishedTx.call({from: accounts[0]});
      await multiSigWallet.setFinishedTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var isLive = await token.tgeLive.call();
      assert(!isLive);
    });

    it("Incorrect caller of setFinishedTx when tge is live results in fail.", async function() {
      try {
        await multiSigWallet.setFinishedTx({from: incorrectCallerAddress});
      } catch (e) {
        return true;
      }
      throw new Error();
    });

    it("Call of setFinishedTx when tge is not live results in fail.", async function() {
      var transactionId = await multiSigWallet.setFinishedTx.call({from: accounts[0]});
      await multiSigWallet.setFinishedTx({from: accounts[0]});
      multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]}).then(function(e){
        assert.equal("ExecutionFailure", e["logs"][1]["event"]);
      });
    });

    it("Changing settings when tge is live results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var index = await multiSigWallet.tgeSettingsChangeRequest.call(100, 10, 89, 1, 2, 2, 5, {from: accounts[0]});
      await multiSigWallet.tgeSettingsChangeRequest(100, 10, 89, 1, 2, 2, 5, {from: accounts[0]});
      await multiSigWallet.confirmSettingsChange(index, {from: accounts[0]});
      try {
        await multiSigWallet.confirmSettingsChange(index, {from: accounts[1]});
      } catch (e) {
          var tgeSettingsAmount = await token.tgeSettingsAmount.call();
          var tgeSettingsPartInvestor = await token.tgeSettingsPartInvestor.call();
          var tgeSettingsPartProject = await token.tgeSettingsPartProject.call();
          var tgeSettingsPartFounders = await token.tgeSettingsPartFounders.call();
          var tgeSettingsBlocksPerStage = await token.tgeSettingsBlocksPerStage.call();
          var tgeSettingsPartInvestorIncreasePerStage = await token.tgeSettingsPartInvestorIncreasePerStage.call();
          var tgeSettingsMaxStages = await token.tgeSettingsMaxStages.call();

          assert.equal(tgeSettingsAmount.toNumber(), tgeSettingsAmountOriginal, 'tgeSettingsAmount is incorrect');
          assert.equal(tgeSettingsPartInvestor.toNumber(), 25, 'tgeSettingsPartInvestor is incorrect');
          assert.equal(tgeSettingsPartProject.toNumber(), 50, 'tgeSettingsPartProject is incorrect');
          assert.equal(tgeSettingsPartFounders.toNumber(), 50, 'tgeSettingsPartProject is incorrect');
          assert.equal(tgeSettingsBlocksPerStage.toNumber(), 20, 'tgeSettingsBlocksPerStage is incorrect');
          assert.equal(tgeSettingsPartInvestorIncreasePerStage.toNumber(), 25, 'tgeSettingsPartInvestorIncreasePerStage is incorrect');
          return assert.equal(tgeSettingsMaxStages.toNumber(), 10, 'tgeSettingsMaxStages is incorrect');
      }
      throw new Error();
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

    it("Correct caller of setFreezeTx results in freeze.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var transactionId = await multiSigWallet.setFreezeTx.call({from: accounts[0]});
      await multiSigWallet.setFreezeTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var isFrozen = await token.isFrozen.call();
      assert(isFrozen);
    });

    it("Incorrect caller of setFreezeTx results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      try {
        await multiSigWallet.setFreezeTx({from: incorrectCallerAddress});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("When frozen, token transfer calls result in false.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });

      var transactionId = await multiSigWallet.setFreezeTx.call({from: accounts[0]});
      await multiSigWallet.setFreezeTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      try {
        await token.transfer(accounts[4], 5, {from: accounts[3]});
      } catch(e) {
        return true;
      }
      throw new Error();
    });

    it("When frozen, transferFrom calls result in false.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: 95, gas:3000000 });

      var transactionId = await multiSigWallet.setFreezeTx.call({from: accounts[0]});
      await multiSigWallet.setFreezeTx({from: accounts[0]});
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
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
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
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: web3.toWei(8, "ether"), gas:3000000 });
      var beforeBalance = await web3.eth.getBalance(web3.eth.accounts[3]);

      transactionId = await multiSigWallet.setFreezeTx.call({from: accounts[0]});
      await multiSigWallet.setFreezeTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
        var gasPr = 10;

      var totalSupply = await token.totalSupply.call();
        totalSupply=totalSupply.toNumber();
      var bal = await token.invBalances.call(accounts[3]);
        bal = bal.toNumber();
      var totalInvSupply = await token.totalInvSupply.call();
        totalInvSupply=totalInvSupply.toNumber();

      var gas = await token.withdrawFrozen.estimateGas({from: accounts[3]});
      await token.withdrawFrozen({from: accounts[3], gasPrice: gasPr});

      var afterBalance = await web3.eth.getBalance(web3.eth.accounts[3]);
      var amountToWithdraw = (totalSupply*bal/totalInvSupply);
      var expectedBalance = (beforeBalance.add(amountToWithdraw))-(gas*gasPr);

      assert.equal(expectedBalance.valueOf(), afterBalance.valueOf());
    });

    it("When frozen, sending Ether to token contract results in fail.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      var transactionId = await multiSigWallet.setFreezeTx.call({from: accounts[0]});
      await multiSigWallet.setFreezeTx({from: accounts[0]});
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
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: web3.toWei(10, "ether"), gas:3000000 });

      var transactionId = await multiSigWallet.setFreezeTx.call({from: accounts[0]});
      await multiSigWallet.setFreezeTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});

      try {
        await token.burn(1, {from: accounts[3]});
      } catch(e) {
        return true;
      }
      throw new Error()
    });

    it("Calling burn when NOT frozen results correct Ether transfer.", async function() {
      var transactionId = await multiSigWallet.setLiveTx.call({from: accounts[0]});
      await multiSigWallet.setLiveTx({from: accounts[0]});
      await multiSigWallet.confirmTransaction(transactionId, {from: accounts[1]});
      await web3.eth.sendTransaction({ from: accounts[3], to: token.address, value: web3.toWei(8, "ether"), gas:3000000 });
      var beforeBalance = await web3.eth.getBalance(web3.eth.accounts[3]);

      var gas = await token.burn.estimateGas(web3.toWei(1, "ether"), {from: accounts[3]});
      await token.burn(web3.toWei(1, "ether"), {from: accounts[3]});
      var afterBalance = await web3.eth.getBalance(web3.eth.accounts[3]);

      var expectedBalance = beforeBalance.sub(web3.toWei(gas/10, "szabo")).add(web3.toWei(1, "ether"));
      assert.equal(expectedBalance.toNumber(), afterBalance.toNumber());
    });
  });

  describe("Main scenario", function() {
      it(" ", async function() {

      });

  });



});
