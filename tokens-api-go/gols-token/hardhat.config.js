import 'dotenv/config';

export default {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
