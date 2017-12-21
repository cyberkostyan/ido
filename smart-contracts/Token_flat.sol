pragma solidity ^0.4.15;
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
contract ERC20 is Base {
    using SafeMath for uint;
    uint public totalSupply;
    bool public isFrozen = false;
    event Transfer(address indexed _from, address indexed _to, uint _value);
    event Approval(address indexed _owner, address indexed _spender, uint _value);
    function transfer(address _to, uint _value) public isNotFrozenOnly onlyPayloadSize(2 * 32) returns (bool success) {
        require(_to != address(0));
        require(_value <= balances[msg.sender]);
        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msg.sender, _to, _value);
        return true;
    }
    function transferFrom(address _from, address _to, uint _value) public isNotFrozenOnly onlyPayloadSize(3 * 32) returns (bool success) {
        require(_to != address(0));
        require(_value <= balances[_from]);
        require(_value <= allowed[_from][msg.sender]);
        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        Transfer(_from, _to, _value);
        return true;
    }
    function balanceOf(address _owner) public constant returns (uint balance) {
        return balances[_owner];
    }
    function approve_fixed(address _spender, uint _currentValue, uint _value) public isNotFrozenOnly onlyPayloadSize(3 * 32) returns (bool success) {
        if(allowed[msg.sender][_spender] == _currentValue){
            allowed[msg.sender][_spender] = _value;
            Approval(msg.sender, _spender, _value);
            return true;
        } else {
            return false;
        }
    }
    function approve(address _spender, uint _value) public isNotFrozenOnly onlyPayloadSize(2 * 32) returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }
    function allowance(address _owner, address _spender) public constant returns (uint remaining) {
        return allowed[_owner][_spender];
    }
    function totalSupply() public constant returns (uint totalSupply) {
        return totalSupply;
    }
    mapping (address => uint) balances;
    mapping (address => mapping (address => uint)) allowed;
    modifier isNotFrozenOnly() {
        require(!isFrozen);
        _;
    }
    modifier isFrozenOnly(){
        require(isFrozen);
        _;
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
    uint public tgeSettingsPartInvestor;
    uint public tgeSettingsPartProject;
    uint public tgeSettingsPartFounders;
    uint public tgeSettingsBlocksPerStage;
    uint public tgeSettingsPartInvestorIncreasePerStage;
    uint public tgeSettingsAmountCollect;
    uint public tgeSettingsAmountLeft;
    uint public tgeSettingsMaxStages;
    uint tgeStackSender;
    uint tgeStackProject;
    uint tgeStackFounders;
    address public projectWallet;
    address public foundersWallet;
    address constant public burnAddress = 0x0;
    mapping (address => uint) public invBalances;
    uint public totalInvSupply;
    modifier isTgeLive(){
        require(tgeLive);
        _;
    }
    modifier isNotTgeLive(){
        require(!tgeLive);
        _;
    }
    modifier maxStagesIsNotAchieved() {
        uint stage = block.number.sub(tgeStartBlock).div(tgeSettingsBlocksPerStage);
        require(stage <= tgeSettingsMaxStages);
        _;
    }
    modifier targetIsNotAchieved(){
        require(tgeSettingsAmountCollect < tgeSettingsAmount);
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
    maxStagesIsNotAchieved
    noAnyReentrancy
    {
        require(msg.value > 0);
        if(tgeSettingsAmountCollect.add(msg.value) >= tgeSettingsAmount){
            _finishTge();
        }
        uint refundAmount = 0;
        uint senderAmount = msg.value;
        if(tgeSettingsAmountCollect.add(msg.value) >= tgeSettingsAmount){
            refundAmount = tgeSettingsAmountCollect.add(msg.value).sub(tgeSettingsAmount);
            senderAmount = msg.value.sub(refundAmount);
        }
        uint stage = block.number.sub(tgeStartBlock).div(tgeSettingsBlocksPerStage);        
        
        uint currentPartInvestor = tgeSettingsPartInvestor.add(stage.mul(tgeSettingsPartInvestorIncreasePerStage));
        uint allStakes = currentPartInvestor.add(tgeSettingsPartProject).add(tgeSettingsPartFounders);
        uint amountProject = senderAmount.mul(tgeSettingsPartProject).div(allStakes);
        uint amountFounders = senderAmount.mul(tgeSettingsPartFounders).div(allStakes);
        uint amountSender = senderAmount.sub(amountProject).sub(amountFounders);
        _mint(amountProject, amountFounders, amountSender);
        msg.sender.transfer(refundAmount);
    }
    function setFinished()
    public
    only(projectWallet)
    isNotFrozenOnly
    isTgeLive
    {
        if(balances[projectWallet] > 1*BIT){
            _finishTge();
        }
    }
    /// @dev Start new tge stage
    function tgeSetLive()
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
    noAnyReentrancy    
    returns(bool _success)
    {
        require(balances[msg.sender] >= _amount);
        balances[msg.sender] = balances[msg.sender].sub(_amount);
        balances[burnAddress] = balances[burnAddress].add(_amount);
        totalSupply = totalSupply.sub(_amount);
        
        msg.sender.transfer(_amount);
        Transfer(msg.sender, 0x0, _amount);
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
    function goLive()
    public
    only(projectWallet)
    isNotFrozenOnly
    returns (bool)
    {
        isFrozen = true;
        totalInvSupply = address(this).balance;
        return true;
    }
    /// @dev Allows to users withdraw eth in frozen stage 
    function withdrawFrozen()
    public
    isFrozenOnly
    noAnyReentrancy
    {
        require(invBalances[msg.sender] > 0);
        
        uint amountWithdraw = totalInvSupply.mul(invBalances[msg.sender]).div(totalSupply);        
        invBalances[msg.sender] = 0;
        msg.sender.transfer(amountWithdraw);
    }
    /// @dev Allows an owner to confirm a change settings request.
    function executeSettingsChange(
        uint amount, 
        uint partInvestor,
        uint partProject, 
        uint partFounders, 
        uint blocksPerStage, 
        uint partInvestorIncreasePerStage,
        uint maxStages
    ) 
    public
    only(projectWallet)
    isNotTgeLive 
    isNotFrozenOnly
    returns(bool success) 
    {
        tgeSettingsAmount = amount;
        tgeSettingsPartInvestor = partInvestor;
        tgeSettingsPartProject = partProject;
        tgeSettingsPartFounders = partFounders;
        tgeSettingsBlocksPerStage = blocksPerStage;
        tgeSettingsPartInvestorIncreasePerStage = partInvestorIncreasePerStage;
        tgeSettingsMaxStages = maxStages;
        return true;
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
    function isLive()
    public
    returns(bool)
    {
        return isFrozen;
    }
    function tgeCurrentPartInvestor()
    public
    isTgeLive
    returns(uint)
    {
        uint stage = block.number.sub(tgeStartBlock).div(tgeSettingsBlocksPerStage);
        return tgeSettingsPartInvestor.add(stage.mul(tgeSettingsPartInvestorIncreasePerStage));
    }
    function tgeNextPartInvestor()
    public
    isTgeLive
    returns(uint)
    {
        uint stage = block.number.sub(tgeStartBlock).div(tgeSettingsBlocksPerStage).add(1);        
        return tgeSettingsPartInvestor.add(stage.mul(tgeSettingsPartInvestorIncreasePerStage));
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
        invBalances[msg.sender] = invBalances[msg.sender].add(_amountSender);
        tgeSettingsAmountCollect = tgeSettingsAmountCollect.add(msg.value);
        tgeSettingsAmountLeft = tgeSettingsAmountLeft.sub(msg.value);
        totalSupply = totalSupply.add(msg.value);
        Transfer(0x0, msg.sender, _amountSender);
    }
}
