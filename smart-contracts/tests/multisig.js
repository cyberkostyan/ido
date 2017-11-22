const MultiSigWallet = artifacts.require('./multisig/Multisig.sol')
const web3 = MultiSigWallet.web3

const utils = require('./utils')

contract('MultiSigWallet', async (accounts) => {
    let multisigInstance = await MultiSigWallet.deployed();
    const requiredConfirmations = 2

    it('Test execution after requirements changed', async () => {
        const deposit = 1000

        it('Send money to wallet contract', async function() {
            await new Promise((resolve, reject) => web3.eth.sendTransaction({
                to: multisigInstance.address,
                value: deposit,
                from: accounts[0]
            }, e => (e ? reject(e) : resolve())))
            const balance = await utils.balanceOf(web3, multisigInstance.address)
            assert.equal(balance.valueOf(), deposit)

            // Add owner wa_4
            const addOwnerData = multisigInstance.contract.addOwner.getData(accounts[3])
            const transactionId = utils.getParamFromTxEvent(
                await multisigInstance.submitTransaction(multisigInstance.address, 0, addOwnerData, {from: accounts[0]}),
                'transactionId',
                null,
                'Submission'
            )
        });

        it('There is one pending transaction', async function() {
            const excludePending = false
            const includePending = true
            const excludeExecuted = false
            const includeExecuted = true
            assert.deepEqual(
                await multisigInstance.getTransactionIds(0, 1, includePending, excludeExecuted),
                [transactionId]
            )
        });

        it('Update required to 1', async function() {
            const newRequired = 1
            const updateRequirementData = multisigInstance.contract.changeRequirement.getData(newRequired)
        });

        it('Submit successfully', async function() {
            const transactionId2 = utils.getParamFromTxEvent(
                await multisigInstance.submitTransaction(multisigInstance.address, 0, updateRequirementData, {from: accounts[0]}),
                'transactionId',
                null,
                'Submission'
            )

            assert.deepEqual(
                await multisigInstance.getTransactionIds(0, 2, includePending, excludeExecuted),
                [transactionId, transactionId2]
            )
        });

        it('Confirm change requirement transaction', async function() {
            await multisigInstance.confirmTransaction(transactionId2, {from: accounts[1]})
            assert.equal((await multisigInstance.required()).toNumber(), newRequired)
            assert.deepEqual(
                await multisigInstance.getTransactionIds(0, 1, excludePending, includeExecuted),
                [transactionId2]
            )
        });

        it('Execution fails, because sender is not wallet owner', async function() {
            utils.assertThrowsAsynchronously(
                () => multisigInstance.executeTransaction(transactionId, {from: accounts[9]})
            )
        });

        it('Because the # required confirmations changed to 1, the addOwner transaction can be executed now', async function() {
            await multisigInstance.executeTransaction(transactionId, {from: accounts[0]})
            assert.deepEqual(
                await multisigInstance.getTransactionIds(0, 2, excludePending, includeExecuted),
                [transactionId, transactionId2]
            )
        });
    })
})