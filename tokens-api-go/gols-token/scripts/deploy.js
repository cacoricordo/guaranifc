import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import fs from 'fs'

const account = privateKeyToAccount(process.env.PRIVATE_KEY)

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC)
})

const bytecode = fs.readFileSync('./artifacts/contracts/GOLS.sol/GOLS.json', 'utf8')
const artifact = JSON.parse(bytecode)

const hash = await client.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
})

console.log('🚀 Deploy tx:', hash)
