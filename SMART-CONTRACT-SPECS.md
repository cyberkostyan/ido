# Specs for Annihilat.io smart contract.

## Abstract.

This smart contract will implement functionality of [Initial Development Offering](README.md) for contributing to Annihilat.io. This is basically an [ERC20](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) standart token with some additional functionality that gives the founders ability to settle developmers in tokens.

## Specs

Tokens are backed by ethereum with a 1:1 ratio. When contributors are compensated for their work, token is transferred from project multisig wallet to contributor's wallet. Then contributors at any time they want can exchange the tokens for ETH kept in smart contract witha 1:1 ratio, at wich point the Tokens are burnt. As the amount of tokens issued must always be equal to amount of ETH in the contract. All transaction fees must be paid by caller of contract methods.

If project wallet is empty (project out of tokens), founders (controlling multisig wallet) setup a new round of investment, they set a starting rate that investments are accepted at. E.g. 1:3. That means investor will get 1 token in exchange for 3 ether, and project multisig address will get 2 tokens. Founders also set maximum investment accepted for this round.

Every day the rate is decrease by a certain amount. E.g 0.5... This means that the rate will be as follows:
* day 1: 1:3 (investor 1 token, project 2 tokens for every 1 ETH invested)
* day 2: 1:2.5 (investor 1 token, project 1.5 tokens for every 1 ETH invested)
* day 3: 1:2 (investor 1 token, project 1 token for every 1 ETH invested)
* day 4: 1:1.5 (investor 1 token, project 1.5 token for every 1 ETH invested)
* day 5: the round is finished as for every ether invested, there is no tokens for project.

## ERC20

It is important for the Token to be [ERC20 compliant](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) to be listed immediately on DEXes. E.g. EtherDelta. 

Make sure we have an alternative method in the token 

```javascript
 function approve_fixed(address _spender, uint _currentValue, uint _value) returns (bool success) {
 ```

This is an alternative to *approve* without security issues.

## Minting
The minting of tokens is automatic during crowdfunding rounds or how Swiss lawyers like to call them Token Generation Event rounds. The Token Generation Event (TGE) is either on or off.

```javascript
bool tgeLive = false;
```
If TGE is not LIVE all ETH sent to contract is automatically sent back.

If TGE is LIVE, all ETH sent to tokens remains in contract, and equal amount of tokens is generated. They are generated and distributed according to tgeSettings.

TGE automatically goes Live when there is less than 1 Token left in project multisig wallet. At this time ANYONE can send tokens to the contract and receive their portion of the tokens. Sending any amount of ETH to the token address triggers the tgeLive flag to be set to true and countdown begins. You can also trigger the TGE by calling a special method.

```javascript
function setLive() {
  if (<no more than 1 token left in project wallet>) {
     tgeLive = true;
     <start TGE countdown>
  }
}

```

**Note:** On minting, do not forget to include the ERC20-compliant call to Transfer event so that many wallets and block explorers can see the tokens on balances of holders.

TGE round ends according to specification. Either when the desired amount is raised (set by founders' multisig decision). Or the day comes when there is no tokens to project distributed to project multisig wallet.

## Multisig

The Token contract's project tokens must be controlled by founder's multisig wallet. Also this mutisig contract must control the settings of each TGE round.

The contract must be owned by multiple owners. X out of Y owner decisions need to be required in order to perform the following API operations that transfer ownership to other owners in case they changed:

```javascript
 function transferOwnership(address _from, _to) returns (uint _txIndex) {
 // initiate transfer of ownership rights for the contract. this will
 // create a transaction required to transfer the ownership
 // from one owner to another. This must be checked if ownership is not 
 // transferred to the same address, or to an address that is already an owner.
 }
 
 function confirmTransferOwnership(uint _txIndex) returns (bool success) {
 // confirm transfer of ownership that was previously initiated.
 // if 2 out of 3 wallets required to confirm this, calling this method on a 
 // earlier generated _txIndex will confirm the transfer initiation. (provided
 // the owner that calls this method is different than that that called 
 // original transferOwnership. This function will return true if 
 // no more confirmations is required from other owner.
 }
 
function viewTransferDetails(uint _txIndex) returns (address _from, _to, approvedBy) {
// returns the addresses requested for the _txIndex so the approver
// can verify easily what was sent in transfer request.
// approvedBy will show how many founders have approved the transfer already.
}

 function acceptTransferOwnership(uint _txIndex) returns (bool success) {
 // this must be called by the new owner in order for the ownership transfer
 // to take place. until this function returns true, no transfer should take
 // place.
 }

 ```

## TGE settings.

Founders' multisig contract controls how each TGE round is setup by setting 4 parameters.

1. Amount in ETH/tokens to be raised.
2. Starting ratio of TOKENS to invested ETH. (amount of tokens that goes to investor).
3. Duration of each stage of round where ratio remains the same. (in number of blocks to make the pace more definite)
4. The amount of multiplier being deducted from tokens going to project on each stage.

When TGE round is Live TGE settings *may not* be modified. The settings may only be modified before TGE round.

```javascript
function tgeSettingsChangeRequest(uint amount, partSender, partProject, partFounders, blocksPerStage, ratioDecreasePerStage) only(owner) tgeNotLive public returns (uint _txIndex) {
// sends a request to change settings.
// @returns index of the settings change request. other founders will confirm
// the changes using this index.
// example: tgeSettingsChangeRequest(1000, 10, 89, 1, 6000, 2);
//
}

function confirmSettingsChange(uint _txIndex) only(owner) tgeNotLive public returns (bool success) {
// confirms settings change previously requested by another founder
// @returns true if confirmed successfully, false if more confirmations are needed.
}

function viewSettingsChange(uint _txIndex) only(owner) tgeNotLive public returns (uint amount, partSender, partProject, partFounders, blocksPerStage, ratioDecreasePerStage) {
// shows what settings were requested in a settings change request
// 
}

```

Note: I am not a solidity programmer, so the functions may differ, its only a suggestion.

## Burning

The tokens can be liquidated at any time by a token holder, at this stage tokens are burnt and the token contract sends the same amount of ETH to token holder. Token holder obviously can not burn more tokens than he owns. Also as tokens are burnt total supply is decreased by the same number of tokens.

It should be a simple function to exchange ether for tokens. Something like:

```javascript
function burn(uint amount) public tgeNotLive returns (bool success) {
// @returns true if tokens were burnt successfully.
// this should also fire a Burn event, that may become standart in the future,
// also there hsould be a burnAddress, that will hold burnt adddresses,
// and in the totalSupply should always return totalSuppy-balanceOf(burnAddress)
//
}
```

Need to check if its possible to pay for transaction with balances of the contract, if so, need to make sure there is enough gas for transaction in the amount being transferred.

