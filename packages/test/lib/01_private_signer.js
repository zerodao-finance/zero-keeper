const { ethers } = require("ethers");
const { makePrivateSigner } = require("ethers-flashbots");

exports.DefaultTest = ( async () => {
    const test_provider = 'https://eth-mainnet.alchemyapi.io/v2/gMO3S4SBWM72d94XKR4Hy2pbviLjmLqk'
    const wallet = ethers.Wallet.createRandom()
    const provider = new ethers.providers.JsonRpcProvider(test_provider)

    let signer = makePrivateSigner({signer: wallet.connect(provider)})
    console.log(await signer)
    console.log(await signer.getGasPrice())
})