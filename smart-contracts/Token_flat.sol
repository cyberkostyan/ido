pragma solidity ^0.4.15;
contract Base {
    modifier only(address allowed) {
        require(msg.sender == allowed);
        _;
    }
    modifier onlyPayloadSize(uint size) {
        assert(msg.data.length == size + 4);
        _;
    } 
    // *************************************************
    // *          reentrancy handling                  *
    // *************************************************
    uint private bitlocks = 0;
    modifier noReentrancy(uint m) {
        var _locks = bitlocks;
        require(_locks & m <= 0);
        bitlocks |= m;
        _;
        bitlocks = _locks;
    }
    modifier noAnyReentrancy {
        var _locks = bitlocks;
        require(_locks <= 0);
        bitlocks = uint(-1);
        _;
        bitlocks = _locks;
    }
    modifier reentrant { _; }
}
contract Owned is Base {
    address public owner;
    address newOwner;
    function Owned() {
        owner = msg.sender;
    }
    function transferOwnership(address _newOwner) only(owner) {
        newOwner = _newOwner;
    }
    function acceptOwnership() only(newOwner) {
        OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    event OwnershipTransferred(address indexed _from, address indexed _to);
}
contract ERC20 is Owned {
    using SafeMath for uint;
    event Transfer(address indexed _from, address indexed _to, uint _value);
    event Approval(address indexed _owner, address indexed _spender, uint _value);
    function transfer(address _to, uint _value) isNotFrozenOnly onlyPayloadSize(2 * 32) returns (bool success) {
        require(_to != address(0));
        require(_value <= balances[msg.sender]);
        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msg.sender, _to, _value);
        return true;
    }
    function transferFrom(address _from, address _to, uint _value) isNotFrozenOnly onlyPayloadSize(3 * 32) returns (bool success) {
        require(_to != address(0));
        require(_value <= balances[_from]);
        require(_value <= allowed[_from][msg.sender]);
        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        Transfer(_from, _to, _value);
        return true;
    }
    function balanceOf(address _owner) constant returns (uint balance) {
        return balances[_owner];
    }
    function approve_fixed(address _spender, uint _currentValue, uint _value) isNotFrozenOnly onlyPayloadSize(3 * 32) returns (bool success) {
        if(allowed[msg.sender][_spender] == _currentValue){
            allowed[msg.sender][_spender] = _value;
            Approval(msg.sender, _spender, _value);
            return true;
        } else {
            return false;
        }
    }
    function approve(address _spender, uint _value) isNotFrozenOnly onlyPayloadSize(2 * 32) returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }
    function allowance(address _owner, address _spender) constant returns (uint remaining) {
        return allowed[_owner][_spender];
    }
    mapping (address => uint) balances;
    mapping (address => mapping (address => uint)) allowed;
    uint public totalSupply;
    bool public isFrozen = false;
    modifier isNotFrozenOnly() {
        require(!isFrozen);
        _;
    }
    modifier isFrozenOnly(){
        require(isFrozen);
        _;
    }
}
library SafeMath {
    function mul(uint256 a, uint256 b) internal constant returns (uint256) {
        uint256 c = a * b;
        assert(a == 0 || c / a == b);
        return c;
    }
    function div(uint256 a, uint256 b) internal constant returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }
    function sub(uint256 a, uint256 b) internal constant returns (uint256) {
        assert(b <= a);
        return a - b;
    }
    function add(uint256 a, uint256 b) internal constant returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}
contract Token is ERC20 {
    string public name = "Annihilat.io Token";
    string public symbol = "ANNI";
    uint8 public decimals = 18;
    uint public constant BIT = 10**18;
    uint public constant BASE = 10000 * BIT;
    bool tgeLive = false;
    bool frozen = false;
    uint tgeStartBlock;
    uint public tgeSettingsAmount;
    uint public tgeSettingsPartSender;
    uint public tgeSettingsPartProject;
    uint public tgeSettingsPartFounders;
    uint public tgeSettingsBlocksPerStage;
    uint public tgeSettingsPartProjectDecreasePerStage;
    uint public tgeSettingsPartFoundersDecreasePerStage;
    uint public tgeSettingsAmountCollect;
    uint public tgeSettingsAmountLeft;
    uint public tgeCurrentPartProject;
    uint public tgeNextPartProject;
    uint tgeStackSender;
    uint tgeStackProject;
    uint tgeStackFounders;
    address public projectWallet;
    address public foundersWallet;
    address constant public burnAddress = 0x0;
    mapping(address => bool) isOwner;
    address[] owners;
    mapping(address => bool) frozenConfirms;
    struct SettingsRequest 
    {
        uint amount;
        uint partSender;
        uint partProject;
        uint partFounders;
        uint blocksPerStage;
        uint partProjectDecreasePerStage;
        uint partFoundersDecreasePerStage;
        bool executed;
        mapping(address => bool) confirmations;
    }
    uint settingsRequestsCount = 0;
    mapping(uint => SettingsRequest) settingsRequests;
    modifier isTgeLive(){
        require(tgeLive);
        _;
    }
    modifier isNotTgeLive(){
        require(!tgeLive);
        _;
    }
    modifier targetIsNotAchieved(){
        require(tgeSettingsAmountCollect < tgeSettingsAmount);
        _;
    }
    modifier onlyOwners(){
        require(isOwner[msg.sender]);
        _;
    }
    event Burn(address indexed _owner,  uint _value);
    /// @dev Constructor
    /// @param _projectWallet Wallet of project
    /// @param _foundersWallet Wallet of founders
    function Token(address _projectWallet, address _foundersWallet){
        projectWallet = _projectWallet;
        foundersWallet = _foundersWallet;
    }
    /// @dev Fallback function allows to buy tokens
    function ()
    public
    payable
    isTgeLive
    isNotFrozenOnly
    targetIsNotAchieved
    {
        require(msg.value >= 1 ether);
        require(tgeSettingsAmountCollect.add(msg.value) <= tgeSettingsAmount);
        require(tgeSettingsAmountLeft >= msg.value);
        if(tgeSettingsAmountCollect.add(msg.value) == tgeSettingsAmount || tgeSettingsAmountLeft < BIT){
            _finishTge();
        }
        uint stage = block.number.sub(tgeStartBlock).div(tgeSettingsBlocksPerStage);
        uint currentPartProject = tgeSettingsPartProject.sub(stage.mul(tgeSettingsPartProjectDecreasePerStage));
        uint currentPartFounders = tgeSettingsPartFounders.sub(stage.mul(tgeSettingsPartFoundersDecreasePerStage));
        uint allStakes = tgeSettingsPartSender.add(currentPartProject).add(currentPartFounders);
        uint amountProject = msg.value.mul(currentPartProject).div(allStakes);
        uint amountFounders = msg.value.mul(currentPartFounders).div(allStakes);
        uint amountSender = msg.value.sub(amountProject).sub(amountFounders);
        _mint(amountProject, amountFounders, amountSender);
    }
    /// @dev Start new tge stage
    function setLive()
    public
    only(projectWallet)
    isNotTgeLive
    isNotFrozenOnly
    {
        tgeLive = true;
        tgeStartBlock = block.number;
        tgeSettingsAmountLeft = tgeSettingsAmount;
        tgeSettingsAmountCollect = 0;
    }
    /// @dev Burn tokens to burnAddress from msg.sender wallet
    /// @param _amount Amount of tokens
    function burn(uint _amount)
    public 
    isNotTgeLive
    noAnyReentrancy    
    returns(bool _success)
    {
        require(balances[msg.sender] >= _amount);
        transfer(burnAddress, _amount);
        Burn(msg.sender, _amount);
        return true;
    }
    /// @dev _foundersWallet Wallet of founders
    /// @param dests array of addresses 
    /// @param values array amount of tokens to transfer    
    function multiTransfer(address[] dests, uint[] values) 
    public 
    isNotFrozenOnly
    returns(uint) 
    {
        uint i = 0;
        while (i < dests.length) {
           transfer(dests[i], values[i]);
           i += 1;
        }
        return i;
    }
    //---------------- FROZEN -----------------
    /// @dev Allows an owner to confirm goLive process
    /// @return Confirmation status
    function confirmGoLive()
    public
    onlyOwners
    isNotFrozenOnly
    returns (bool)
    {
        frozenConfirms[msg.sender] = true;
        if(isConfirmedFrozenRequest()){
            isFrozen = true;
            return true;
        } else {
            return false;
        }
    }
    
    /// @dev Allows an owner to cancel confirmation
    function cancelGoLive()
    public
    onlyOwners
    isNotFrozenOnly
    returns (bool)
    {
        frozenConfirms[msg.sender] = false;
        return true;
    }
    /// @dev Returns the confirmation status of goLive process.
    /// @return Confirmation status.
    function isConfirmedFrozenRequest()
    public
    constant
    returns (bool)
    {
        uint count = 0;
        for (uint i = 0; i < owners.length; i++) {
            if (frozenConfirms[owners[i]])
                count += 1;
            if (count == owners.length)
                return true;
        }
        return false;
    }
    /// @dev Allows to users withdraw eth in frozen stage 
    function withdrawFrozen()
    public
    isFrozenOnly
    noAnyReentrancy
    {
        require(balances[msg.sender] > 0);
        uint amountWithdraw = address(this).balance.mul(balances[msg.sender]).div(totalSupply);        
        msg.sender.transfer(amountWithdraw);
    }
    //---------------- TGE SETTINGS -----------
    /// @dev Sends request to change settings
    /// @return Transaction ID
    function tgeSettingsChangeRequest(
        uint amount, 
        uint partSender,
        uint partProject, 
        uint partFounders, 
        uint blocksPerStage, 
        uint partProjectDecreasePerStage,
        uint partFoundersDecreasePerStage
    ) 
    public
    onlyOwners
    isNotTgeLive
    isNotFrozenOnly
    returns (uint _txIndex) 
    {
        _txIndex = settingsRequestsCount;
        settingsRequests[_txIndex] = SettingsRequest({
            amount: amount,
            partSender: partSender,
            partProject: partProject,
            partFounders: partFounders,
            blocksPerStage: blocksPerStage,
            partProjectDecreasePerStage: partProjectDecreasePerStage,
            partFoundersDecreasePerStage: partFoundersDecreasePerStage,
            executed: false
        });
        settingsRequestsCount++;
        return _txIndex;
    }
    /// @dev Allows an owner to confirm a change settings request.
    /// @param _txIndex Transaction ID.
    function confirmSettingsChange(uint _txIndex) 
    public
    onlyOwners
    isNotTgeLive 
    isNotFrozenOnly
    returns(bool success) {
        settingsRequests[_txIndex].confirmations[msg.sender] = true;
        if(isConfirmedSettingsRequest(_txIndex)){
            SettingsRequest storage request = settingsRequests[_txIndex];
            request.executed = true;
            tgeSettingsAmount = request.amount;
            tgeSettingsPartSender = request.partSender;
            tgeSettingsPartProject = request.partProject;
            tgeSettingsPartFounders = request.partFounders;
            tgeSettingsBlocksPerStage = request.blocksPerStage;
            tgeSettingsPartProjectDecreasePerStage = request.partProjectDecreasePerStage;
            tgeSettingsPartFoundersDecreasePerStage = request.partFoundersDecreasePerStage;
            return true;
        } else {
            return false;
        }
    }
    function isConfirmedSettingsRequest(uint transactionId)
    public
    constant
    returns (bool)
    {
        uint count = 0;
        for (uint i = 0; i < owners.length; i++) {
            if (settingsRequests[transactionId].confirmations[owners[i]])
                count += 1;
            if (count == owners.length)
                return true;
        }
        return false;
    }
    /// @dev Shows what settings were requested in a settings change request
    function viewSettingsChange(uint _txIndex) 
    public
    onlyOwners 
    isNotTgeLive 
    returns (uint amount, uint partSender, uint partProject, uint partFounders, uint blocksPerStage, uint partProjectDecreasePerStage, uint partFoundersDecreasePerStage) {
        SettingsRequest storage request = settingsRequests[_txIndex];
        return (
            request.amount,
            request.partSender, 
            request.partProject,
            request.partFounders,
            request.blocksPerStage,
            request.partProjectDecreasePerStage,
            request.partFoundersDecreasePerStage
        );
    }
    //---------------- GETTERS ----------------
    /// @dev Amount of blocks left to the end of this stage of TGE 
    function tgeStageBlockLeft() 
    public 
    isTgeLive
    returns(uint)
    {
        uint stage = block.number.sub(tgeStartBlock).div(tgeSettingsBlocksPerStage).add(1);
        return tgeStartBlock.add(stage.mul(tgeSettingsBlocksPerStage)).sub(block.number);
    }
    //---------------- INTERNAL ---------------
    function _finishTge()
    internal
    {
        tgeLive = false;
    }
    function _mint(uint _amountProject, uint _amountFounders, uint _amountSender)
    internal
    {
        balances[projectWallet] = balances[projectWallet].add(_amountProject);
        balances[foundersWallet] = balances[foundersWallet].add(_amountFounders);
        balances[msg.sender] = balances[msg.sender].add(_amountSender);
        tgeSettingsAmountCollect = tgeSettingsAmountCollect.add(msg.value);
        tgeSettingsAmountLeft = tgeSettingsAmountLeft.sub(msg.value);
        totalSupply = totalSupply.add(msg.value);
        Transfer(0x0, msg.sender, _amountSender);
    }
}