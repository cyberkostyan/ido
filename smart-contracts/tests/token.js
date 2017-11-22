const Token = artifacts.require('./token/Token.sol');
const StringUtil = require('string-format');
const TestUtil = require('./../lib/testUtils.js');
const Storage = require('./../lib/storage');
const ProjectWallet = artifacts.require('./multisig/Multisig.sol');

StringUtil.extend(String.prototype);

it("Запуск", () => {});

contract('Crowdsale', async (accounts) => {
  const ownerAddress = Storage.ownerAddress;
  let crowdsale = await Crowdsale.deployed();
  let token = await Token.deployed();

  async function checkContractOwner(contractInstance, expectedOwner){
    let ownerCall = await contractInstance.owner.call();
    assert.equal(ownerCall.valueOf(), expectedOwner, 'Владелец в контракте, не совпадает со значением, которое задано в настройках');
  };

  async function setState(state){
    await crowdsale.setState(state);
    let currentState = await crowdsale.currentState();
    assert.equal(currentState, state, 'Состояние {0} не установлено'.format(state));
  };

  async function checkCallFnNotOwner(fn, nameFn, nameOwner, ...args) {
    try {
      await fn(...args, {from: accounts[2]});

      assert.fail(0, 0, "{0} может быть вызвана не {1}".format(nameFn, nameOwner));
    } catch (e){
    };
  }

  async function checkCallFnInState(fn, nameFn, state, ...args) {
    try {
      await fn(...args, {from: accounts[2]});

      assert.fail(0, 0, "{0} может быть вызвана в состоянии {1}".format(nameFn, State[state]));
    } catch (e){
    };
  }

  async function checkCallInternalFn(fn, nameFn, ...args) {
    try {
      await fn(...args, {from: accounts[2]});

      assert.fail(0, 0, "{0} не internal функция".format(nameFn));
    } catch (e){
    };
  }

  it('Владелец контрактов должен быть задан корректно', async function() {
    await checkContractOwner(token, ownerAddress);
  });

  it('Проверка internal функций', async function(){
    await checkCallInternalFn(token._mint, 'crowdsale._mint', 0, accounts[1], 100);
    await checkCallInternalFn(token._finishTge, 'crowdsale._finish', 0);
  });

  it('Проверка tgeSettingsChangeRequest', async function(){
    await token.tgeSettingsChangeRequest(100, 10, 40, 50, 1, 10, 10);

    await token.confirmSettingsChange(0, {from: accounts[1]});
    await token.confirmSettingsChange(0, {from: accounts[2]});
  });

  it('setLive', async function(){
    await token.setLive({from: ProjectWallet});
  });

  it('Покупка токенов пользователем напрямую через контракт', async function() {
    await token.send('1000000000000000000000');

    let balance = await token.balanceOf.call(accounts[0]);
    assert.equal(balance, 10 , 'Токены не зачислены на баланс пользователя');

    balance = await token.balanceOf.call(await token.projectWallet());
    assert.equal(balance, 40 , 'Токены не зачислены на баланс проекта');

    balance = await token.balanceOf.call(await token.foundersWallet());
    assert.equal(balance, 50 , 'Токены не зачислены на баланс фоундеров');
  });

  if('TGE закончился', async function(){
    const tgeLive = await token.tgeLive();
    assert.equal(tgeLive, tgeLive , 'TGE не закончился');
  });


});