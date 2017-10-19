# Specs for Annihilat.io smart contract.

## Abstract.

This smart contract will implement functionality of [Initial Development Offering](README.md) for contributing to Annihilat.io. This is basically an [ERC20](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) standart token with some additional functionality.

# ERC20

It is important for the Token to be ERC20 compliant to be listed immediately on DEXes. E.g. EtherDelta. 

Make sure we have an alternative method in the token 

```javascript
 function approve_fixed(address _spender, uint _currentValue, uint _value) returns (bool success) {
 ```

This is an alternative to *approve* without security issues.

# Owners

The contract must be owned by multiple owners. X out of Y owner decisions need to be required in order to perform the following API operations:

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

 function acceptTransferOwnership(uint _txIndex) returns (bool success) {
 // this must be called by the new owner in order for the ownership transfer
 // to take place. until this function returns true, no transfer should take
 // place
 }

 ```
