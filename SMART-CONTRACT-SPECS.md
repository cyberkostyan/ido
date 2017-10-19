# Specs for Annihilat.io smart contract.

## Abstract.

This smart contract will implement functionality of [Initial Development Offering](README.md) for contributing to Annihilat.io. This is basically an [ERC20](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) standart token with some additional functionality.

# ERC20

It is important for the Token to be ERC20 compliant to be listed immediately on DEXes. E.g. EtherDelta. Make sure we have an alternative method in the token 

```javascript
 function approve_fixed(address _spender, uint _currentValue, uint _value) returns (bool success) {
 ```

This is an alternative to *approve* without security exploits.

