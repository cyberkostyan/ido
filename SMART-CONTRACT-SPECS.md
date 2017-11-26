# Specs for Annihilat.io Ethereum smart contract.

## Abstract.

This smart contract will implement functionality of [Initial Development Offering](README.md) for contributing to Annihilat.io. This is basically an [ERC20](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) standart token with some additional functionality that gives the founders ability to settle developmers in tokens.

## Motivation

This token will be used solely as a means of payment, the total supply of the tokens will be transferred to the new blockchain created with proportional distribution of new cryptocurrency between holders of the token. Rather than settling in fiat currency this project settle with contributors with tokens that are backed by ETH.

The distribution of new cryptocurrency will be hardcoded into new blockchain, and to claim it holders of the tokens will need their ethereum private keys that will also work with new blockchain we are creating.

## Specs

Tokens are backed by ethereum with a 1:1 ratio. When contributors are compensated for their work, token is transferred from project multisig wallet to contributor's wallet. Then contributors at any time they want can exchange the tokens for ETH kept in smart contract witha 1:1 ratio, at wich point the Tokens are burnt. As the amount of tokens issued must always be equal to amount of ETH in the contract. All transaction fees must be paid by caller of contract methods.

If project wallet is empty (project out of tokens), founders (controlling multisig wallet) setup a new round of investment, they set a starting rate that investments are accepted at. E.g. 1:3. That means investor will get 1 token in exchange for 3 ether, and project multisig address will get 2 tokens. Founders also set maximum number of tokens for project to be minted for this round.

Every day the amount of tokens investor receieves for every ether invested is increasing making it more attractive to wait another stage of the round, but in increasing the rist that someone will take an opportunity to invest early. Here is an example how the token distribution changes from one stage of investment round to another until the round is finished:

* day 1: 10:50:10 (for every 70 ETH invested, 10 tokens gets investor, 50 tokens gets the project, 10 tokens gets the founders)
* day 2: 20:50:10 (for every 80 ETH invested, 20 gets investor, 50 the project, 10 the founders)
* day 3: 30:50:10 (for every 90 ETH invested, 30 gets investor, 50 the project, 10 the founders)
* day 4: 40:50:10 (for every 100 ETH invested, 40 gets investor, 50 the project, 10 the founders)
....
* day 1000: 50:50:10 (for every 10000 ETH invested, 9940 gets investor, 50 the project, 10 the founders)

Once required number of tokens for the project is collected, investment round ends.

## ERC20

It is important for the Token to be [ERC20 compliant](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) to be listed immediately on DEXes. E.g. EtherDelta. 

Make sure we have an alternative method in the token 

```javascript
 function approve_fixed(address _spender, uint _currentValue, uint _value) returns (bool success) {
 ```

This is an alternative to *approve* without security issues.

Another useful function I would like to be added: 

```javascript
function multi_transfer(address[] dests, uint[] values) public returns (uint ok_count) {
   // This is useful to send tokens to multiple holders of wallet.
   // returns number of transfers that succeded
}
```

The constants for this project hsould be:

```javascript
name = "Annihilat.io Token";
symbol = "ANNI";
decimals = 18;
```

## Minting (TGE)
The minting of tokens is automatic during crowdfunding (investing) rounds or how Swiss lawyers like to call them Token Generation Event rounds. The Token Generation Event (TGE) is either on or off.

```javascript
bool tgeLive = false;
```
If TGE is not LIVE all ETH sent to contract is automatically sent back. Autobouncing.

If TGE is LIVE, all ETH sent to tokens remains in contract, and equal amount of tokens is generated. They are generated and distributed according to tgeSettings (as in example in the beginning of this document).

TGE automatically goes Live when there is less than 1 Token left in project multisig wallet. At this time ANYONE can send ETH to the contract and receive their portion of the tokens. Sending any amount of ETH to the token address triggers the tgeLive flag to be set to true and countdown begins. You can also trigger the TGE by calling a special method.

```javascript
function setLive() {
  if (<no more than 1 token left in project wallet>) {
     tgeLive = true;
     <start TGE countdown>
  }
}

```

> **Note:** On minting, do not forget to include the ERC20-compliant call to Transfer event so that many wallets and block explorers can see the tokens on balances of holders.

TGE round ends when target amount of tokens for the project has been minted.

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

Similar functionality to above should have transfer ownership from the multisig to ERC20 contract receipient. However in addition to regular transfer method there should be batch transfer method available to project's founders.

```javascript
contract ANNI is ERC20 {
  funntion multi_transfer(address[] to, uint[] value) only(founders) public {
      // calls multiple erc20 transfers for all addresses in array to
      // we need this for speeding up distribution of tokens to contributors 
  }
}

contract foundersMultiSig is MultiOwned{
    function requestTransfers(address[] targetAddresses, uint[] amounts) only(founder) public returns(uint txId) {
        // resquest a transfer by founder
    }
    function confirmTransfer(uint txId) only(founder) returns (bool success) {
        // confirms previously intiated transfers
    }
    function viewTransfer(uint txId) only(founder) returns (address[] targetAddresses, uint[] amounts) {
        // shows all transfers in the transfer request
    }
}
```

## TGE settings.

Founders' multisig contract controls how each TGE round is setup by setting 4 parameters.

1. Amount in ETH/tokens to be raised.
2. Starting ratio of TOKENS to invested ETH. (amount of tokens that goes to investor).
3. Duration of each stage of round where ratio remains the same. (in number of blocks to make the pace more definite)
4. The amount of multiplier being deducted from tokens going to investor on each stage.

When TGE round is Live TGE settings *may not* be modified. The settings may only be modified before TGE round.

```javascript
function tgeSettingsChangeRequest(uint amount, partSender, partProject, partFounders, blocksPerStage, partProjectDecreasePerStage) only(owner) tgeNotLive public returns (uint _txIndex) {
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

## Going live

The moment the annihilat.io project goes live with MainNet the state of the smart contract will be changed to "frozen":

 3. % of totalSupply of tokens will be distributed to project's multisig wallet account.
 1. All transfers of tokens will be frozen.
 2. All ether remaining in the project will be returned to investors proportionally to the amount of tokens they have originally received in exchange for ETH they have contributed.

This will mean the start of Annihialt.io live network and a full stop for the smart contract. No TGE events can start nor tokens can be exchanged for Ether.

Going live is also controlled by multisig ofcourse.

```javascript
///
function requestGoLive() only(founder) public returns (uint confirmationsLeft) {
  // send go live request.
}

function confirmGoLive() only(founder) public returns (uint confirmationsLeft) {
    // confirm going live
    // @returns how many confirmations left. 0 if confiremd successfuly and 
    // the MainNet is live now, all smartcontract transactions frozen, and
}

function cancelGoLive() only(founder) public returns (bool success) {
    // @returns true if cancelled successfully, false otherwise (eg. ther was no request?)
}
```

## Status functions

Smart contract should have API that allows to query the state of contract.

```javascript
function isLive() returns (bull live) {
    // Is the mainnet live?
    // if yes, the smart contract is frozen, and no transactions can take place.
}

// standard tge properties:
uint public 
     tgeSettingsAmount,
     tgeSettingsPartInvestor,
     tgeSettingsPartProject,
     tgeSettingsPartFounders,
     tgeSettingsBlocksPerStage,
     tgeSettingsPartInvestorIncreasePerStage,
     // extra properties to see current status of TGE round:
     tgeSettingsAmountCollected, // the amount of ETH collected so far in this round of TGE.
     tgeSettingsAmountLeft, // the amount of ETH left to collect in this round of TGE.     
     tgeCurrentPartInvestor, // current part to investor
     tgeNextPartInvestor; // part going to investor in the next stage
     
bool tgeLive; // is tge Live?

function tgeStageBlocksLeft() public returns (uint blocksLeft) {
    // how many blocks left to the end of this stage of TGE.
    // basically this is how many blocks left to the drop
    // in token ratio going to project.
}

function tgeRoundBlocksLeft() public returns (uint blocksLeft) {
    // how many blocks left to the end of TGE round.
    //
}

```

> Note: All the functions should be read only, public, and accessible from node for free.

Also remember these are suggested ways to read things from contract. The actual implementation should be smarter.

## Example

Example round of tge with the following tge settings:
 * tgeSettingsAmount	1000
 * tgeSettingsPartInvestor	25
 * tgeSettingsPartProject	50
 * tgeSettingsPartFounders	50
 * tgeSettingsBlocksPerStage	1000
 * tgeSettingsPartInvestorIncreasePerStage	25

| block # | ETH received | PartInvestor | PartProject | PartFounders | TokensInvestor | TokensProject | TokensFounders | AmountCollected | AmountLeft |
|-------:|------:|------:| ------:|------:|------:|------:|------:|------:|------:|
| 100 | 15 | 25 | 50 | 50 | 3,00 | 6,00 | 6,00 | 15 | 985 |
| 310 | 15 | 25 | 50 | 50 | 3,00 | 6,00 | 6,00 | 30 | 970 |
| 502 | 26 | 50 | 50 | 50 | 8,67 | 8,67 | 8,67 | 56 | 944 |
| 523 | 95 | 50 | 50 | 50 | 31,67 | 31,67 | 31,67 | 151 | 849 |
| 544 | 91 | 50 | 50 | 50 | 30,33 | 30,33 | 30,33 | 242 | 758 |
| 780 | 95 | 50 | 50 | 50 | 31,67 | 31,67 | 31,67 | 337 | 663 |
| 1006 | 23 | 50 | 50 | 50 | 7,67 | 7,67 | 7,67 | 360 | 640 |
| 1297 | 16 | 50 | 50 | 50 | 5,33 | 5,33 | 5,33 | 376 | 624 |
| 1432 | 79 | 50 | 50 | 50 | 26,33 | 26,33 | 26,33 | 455 | 545 |
| 1568 | 76 | 75 | 50 | 50 | 32,57 | 21,71 | 21,71 | 531 | 469 |
| 1800 | 32 | 75 | 50 | 50 | 13,71 | 9,14 | 9,14 | 563 | 437 |
| 1957 | 83 | 75 | 50 | 50 | 35,57 | 23,71 | 23,71 | 646 | 354 |
| 2247 | 19 | 75 | 50 | 50 | 8,14 | 5,43 | 5,43 | 665 | 335 |
| 2488 | 26 | 75 | 50 | 50 | 11,14 | 7,43 | 7,43 | 691 | 309 |
| 2719 | 4 | 100 | 50 | 50 | 2,00 | 1,00 | 1,00 | 695 | 305 |
| 2911 | 59 | 100 | 50 | 50 | 29,50 | 14,75 | 14,75 | 754 | 246 |
| 3181 | 6 | 100 | 50 | 50 | 3,00 | 1,50 | 1,50 | 760 | 240 |
| 3328 | 90 | 100 | 50 | 50 | 45,00 | 22,50 | 22,50 | 850 | 150 |
| 3423 | 21 | 100 | 50 | 50 | 10,50 | 5,25 | 5,25 | 871 | 129 |
| 3586 | 10 | 125 | 50 | 50 | 5,56 | 2,22 | 2,22 | 881 | 119 |
| 3643 | 65 | 125 | 50 | 50 | 36,11 | 14,44 | 14,44 | 946 | 54 |
| 3659 | 55 | 125 | 50 | 50 | 30,00 | 12,00 | 12,00 | 1000 | 0 |


