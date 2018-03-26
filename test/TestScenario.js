var chai = require("chai");
var expect = chai.expect;
var BigNumber = require('bignumber.js');

var MultiSigWallet = artifacts.require("MultiSigWallet.sol");
var Token = artifacts.require("Token.sol");

contract('', function(accounts) {

    var foundersWallet = accounts[0];

    var investor1 = accounts[1];
    var investor2 = accounts[2];
    var investor3 = accounts[3];
    var investor4 = accounts[4];

    var project1 = accounts[5];
    var project2 = accounts[6];
    var project3 = accounts[7];
    var founder = accounts[8];
    var stranger = accounts[9]

    var investment1 = 10 * 10**18;
    var investment2 = 3 * 10**18;
    var investment3 = 15 * 10**18;

    var confirms = 2;
    var gasPrice = 2;

    //tge settings
    var amount = 20 * 10**18; 
    var partInvestor = 50;
    var partProject = 10; 
    var partFounders = 40; 
    var blocksPerStage = 20; 
    var partInvestorIncreasePerStage = 10;
    var maxStages = 6;

    var token;
    var multisig;

    async function balances(str = "") {
        var projectAmount = web3.eth.getBalance(token.address);

        var investor1eth = web3.eth.getBalance(investor1);
        var investor2eth = web3.eth.getBalance(investor2);
        var investor3eth = web3.eth.getBalance(investor3);

        var investor1ray = await token.balanceOf.call(investor1);
        var investor2ray = await token.balanceOf.call(investor2);
        var investor3ray = await token.balanceOf.call(investor3);

        var totalSupply = await token.totalSupply.call();
        var totalInvSupply = await token.totalInvSupply.call();

        var tgeStartBlock = await token.tgeStartBlock.call();

        var tgeSettingsAmount = await token.tgeSettingsAmount.call();
        var tgeSettingsPartInvestor = await token.tgeSettingsPartInvestor.call();
        var tgeSettingsPartProject = await token.tgeSettingsPartProject.call();
        var tgeSettingsPartFounders = await token.tgeSettingsPartFounders.call();
        var tgeSettingsBlocksPerStage = await token.tgeSettingsBlocksPerStage.call();
        var tgeSettingsPartInvestorIncreasePerStage = await token.tgeSettingsPartInvestorIncreasePerStage.call();
        var tgeSettingsMaxStages = await token.tgeSettingsMaxStages.call();
        var tgeSettingsAmountCollected = await token.tgeSettingsAmountCollected.call();
        var tgeLive = await token.tgeLive.call();

        console.log(str);
        console.log("\n==================BEGIN=================================");
        console.log("First investor has: ", investor1eth.dividedBy(10**18).toString(), " Ether and ", investor1ray.dividedBy(10**18).toString(), " eRAY");
        console.log("Second investor has: ", investor2eth.dividedBy(10**18).toString(), " Ether and ", investor2ray.dividedBy(10**18).toString(), " eRAY");
        console.log("Third investor has: ", investor3eth.dividedBy(10**18).toString(), " Ether and ", investor3ray.dividedBy(10**18).toString(), " eRAY");
        console.log("Token contract balance is ", projectAmount.dividedBy(10**18).toString(), " Ether");
        console.log("Total supply is ", totalSupply.dividedBy(10**18).toString(), " eRAY");
        console.log("totalInvSupply is ", totalInvSupply.dividedBy(10**18).toString());
        console.log("Current block is ", web3.eth.blockNumber);


        console.log("current tge settings");
        console.log("tgeStartBlock is: ", tgeStartBlock.toString());
        console.log("tgeSettingsAmount is: ", tgeSettingsAmount.toString());
        console.log("tgeSettingsPartInvestor: ", tgeSettingsPartInvestor.toString());
        console.log("tgeSettingsPartProject: ", tgeSettingsPartProject.toString());
        console.log("tgeSettingsPartFounders: ", tgeSettingsPartFounders.toString());
        console.log("tgeSettingsBlocksPerStage: ", tgeSettingsBlocksPerStage.toString());
        console.log("tgeSettingsPartInvestorIncreasePerStage: ", tgeSettingsPartInvestorIncreasePerStage.toString());
        console.log("tgeSettingsMaxStages: ", tgeSettingsMaxStages.toString());

        console.log("tgeSettingsAmountCollected: ", tgeSettingsAmountCollected.toString());
        console.log("tgeLive: ", tgeLive.toString());
        console.log("==================END=================================");
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


    it("Deployment", async function() {
        multisig = await  MultiSigWallet.new([project1, project2, project3], confirms, {from: project1});
        var projectWallet = multisig.address;
        token = await Token.new(projectWallet, founder, {from: project1});
    });

    it("Incorrect (not multisig owner) call of setToken results in fail.", async function () {
        try {
            await multisig.setToken(token.address, {from: investor1});
        } catch (e) {
            tokenAddress = await multisig.token.call();
            return assert.equal(tokenAddress, "0x0000000000000000000000000000000000000000", "Incorrect call of setToken changes token in multisig");
        }
        throw new Error();
    });

    it("Call setToken with account equal to owner should succeed", async function() {
        await multisig.setToken(token.address, {from: project1});
        tokenAddress = await multisig.token.call();
        assert.equal(tokenAddress, token.address, "Correct call of setToken doesn't change token in multisig");
    });

    it("Incorrect caller of tgeSettingsChangeRequest results in fail.", async function() {
        try {
            await multisig.tgeSettingsChangeRequest(amount, partInvestor, partProject, partFounders, blocksPerStage, partInvestorIncreasePerStage, maxStages, {from: investor1});
        } catch (e) {
            return true;
        }
        throw new Error();
    });

    it("Correct caller of tgeSettingsChangeRequest results in storing settings request.", async function() {
        index = await multisig.tgeSettingsChangeRequest.call(amount, partInvestor, partProject, partFounders, blocksPerStage, partInvestorIncreasePerStage,  maxStages, {from: project1});
        await multisig.tgeSettingsChangeRequest(amount, partInvestor, partProject, partFounders, blocksPerStage, partInvestorIncreasePerStage, maxStages, {from: project1});
        var settingRequest = await multisig.viewSettingsChange.call(index, {from: stranger});
        expect(toArray(settingRequest)).to.deep.equal([amount, partInvestor, partProject, partFounders, blocksPerStage, partInvestorIncreasePerStage, maxStages]);
    });

    it("Confirmation of tge settings change", async function() {
        var initialCount = await multisig.getSettingsChangeConfirmationCount.call(index.valueOf());
        await multisig.confirmSettingsChange(index, {from: project2});
        var finalCount = await multisig.getSettingsChangeConfirmationCount.call(index.valueOf());
        assert.equal(finalCount.toNumber(), initialCount.toNumber()+1, "confirmation of settings change was not confirmed");

        var tgeSettingsAmount = await token.tgeSettingsAmount.call();
        var tgeSettingsPartInvestor = await token.tgeSettingsPartInvestor.call();
        var tgeSettingsPartProject = await token.tgeSettingsPartProject.call();
        var tgeSettingsPartFounders = await token.tgeSettingsPartFounders.call();
        var tgeSettingsBlocksPerStage = await token.tgeSettingsBlocksPerStage.call();
        var tgeSettingsPartInvestorIncreasePerStage = await token.tgeSettingsPartInvestorIncreasePerStage.call();
        var tgeSettingsMaxStages = await token.tgeSettingsMaxStages.call();

        assert.equal(tgeSettingsAmount, amount);
        assert.equal(tgeSettingsPartInvestor, partInvestor);
        assert.equal(tgeSettingsPartProject, partProject);
        assert.equal(tgeSettingsPartFounders, partFounders);
        assert.equal(tgeSettingsBlocksPerStage, blocksPerStage);
        assert.equal(tgeSettingsPartInvestorIncreasePerStage, partInvestorIncreasePerStage);
        assert.equal(tgeSettingsMaxStages, maxStages);
    });

    it("trying to invest when tge is not live", async function() {
        try {
            await web3.eth.sendTransaction({ from: investor1, to: token.address, value: investment1, gas:3000000 });
        } catch (error) {
            assert(error.message.search('revert') >= 0, 'money were received by contract');
        }
    });

    it("setting tge live.", async function() {
        var isLive = await token.tgeLive.call();
        assert(!isLive);
        var transactionId = await multisig.setLiveTx.call({from: project1});
        await multisig.setLiveTx({from: project1});
        await multisig.confirmTransaction(transactionId, {from: project2});
        var isLive = await token.tgeLive.call();
        assert(isLive);
    });

    it("first successful investment, amount:  " + investment1/10**18 + " Ether", async function() {
        //initTokenBalance = await token.balanceOf.call(investor1);
        //console.log("eray balance of 1st investor", initTokenBalance.toString());
        await balances("After setting tge live and before first investment values are following:");

        initialBalance = web3.eth.getBalance(investor1);
        var gas = await web3.eth.estimateGas({ from: investor1, to: token.address, value: investment1, gas:3000000, gasPrice: gasPrice});
        await web3.eth.sendTransaction({ from: investor1, to: token.address, value: investment1, gas:3000000, gasPrice: gasPrice});
        finalBalance = web3.eth.getBalance(investor1);

        var investment = new BigNumber(investment1.toString());
        var omg = initialBalance.minus(investment.plus(gasPrice*gas));

        //console.log("gas", gas);
        //console.log("init", initialBalance.toNumber());
        //console.log("expected initial", diff.toNumber());
        //console.log("fin", finalBalance.toNumber());
        //console.log("expected final", omg.toNumber());
        //console.log("diff", initialBalance.minus(diff));
        //assert.equal(initialBalance.valueOf(), diff.valueOf(), "some trouble with sending ether");

        assert.equal(finalBalance.valueOf(), omg.valueOf(), "some trouble with sending ether");

        initTokenBalance = await token.balanceOf.call(investor1);
        assert.equal(initTokenBalance.valueOf(), investment1*partInvestor/(partProject+partFounders+partInvestor) , "investor has received incorrect amount of tokens");

        var balance = web3.eth.getBalance(token.address);
        //console.log("After first investment token contract has: ", balance.toString(), " Ether");
        assert.equal(balance, investment1, "token has incorrect amount of ether");
    });

    it("second investment, amount: " + investment2/10**18 + "Ether", async function() {
        await balances("After first investment and before second investment states are following:");

        await web3.eth.sendTransaction({ from: investor2, to: token.address, value: investment2, gas:3000000, gasPrice: gasPrice});
        var balance = web3.eth.getBalance(token.address);
        //console.log("After second investment token contract has: ", balance.toString(), " Ether");
        assert.equal(balance, investment1+investment2, "token has incorrect amount of ether");
    });

    var burnValue = new BigNumber(3 * 10**18);
    //console.log("Burning ", burnValue.toString(), " eRAY");

    it("burning a bit of tokens, burnt amount: "+burnValue.dividedBy(10**18).toString()+" eRAY", async function() {
        await balances("After second investment and before burn states are following:");
        //var burnValue = 5 * 10**17;

        await token.burn(burnValue.toNumber(), {from: investor1});


        var afterTokenBalance = await token.balanceOf.call(investor1);

        //console.log(initTokenBalance.toString());
        //console.log(afterTokenBalance.toString());
        //console.log(initTokenBalance.minus(afterTokenBalance).toString());

        assert.equal(initTokenBalance.minus(burnValue).toString(), afterTokenBalance.toString(), "incorrect amount of tokens was burnt");
        var balance = web3.eth.getBalance(token.address);
        //console.log("After burn token contract has: ", balance.toString(), " Ether");
        assert.equal(balance, investment1+investment2-burnValue.toNumber(), "token has incorrect amount of ether");
    });

    it("third investment, amount: " + investment3/10**18 + " Ether", async function() {
        await balances("After burn and before third investment states are following:");

        var initBalance = web3.eth.getBalance(investor3);
        //console.log("Before third investment investor3 has

        await web3.eth.sendTransaction({ from: investor3, to: token.address, value: investment3, gas:3000000, gasPrice: gasPrice});
        var balance = web3.eth.getBalance(token.address);
        //console.log("After third investment token contract has: ", balance.toString(), " Ether");

        var afterBalance = web3.eth.getBalance(investor3);
        diff = initBalance.minus(afterBalance);
        //console.log("Difference before and after third investment: ", diff.toString());
        //assert.equal(balance.toNumber(), amount, "incorrect amount of ether at the token contract balance");

        //console.log("Token contract balance after third investment ", balance.toString(), " Ether");

        tokenBalance = await token.balanceOf.call(investor3);
        //console.log("token balance of investor3 ", tokenBalance.toString(), " eRay");
    });

    it("fourth investment, amount: " + investment3/10**18 + " Ether", async function() {
        await balances("After third investment and before fourth investment states are following:");
        try {
            await web3.eth.sendTransaction({ from: investor3, to: token.address, value: investment3, gas:3000000, gasPrice: gasPrice});
        } catch (error) {
            assert(error.message.search('revert') >= 0, 'money were received by contract');
        }
        await balances("After fourth investment:");
    });
});
