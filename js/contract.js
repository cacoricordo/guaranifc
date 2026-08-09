// contract.js
import { ethers } from "ethers";

export const CONTRACT_ADDRESS = "0x5C486f7bB86fE22a63702f17A4d39ddcFfC27711"; // GOLS
export const ABI = [
  {
    "inputs": [],
    "name": "mintGoal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export async function connectContract() {
  if (!window.ethereum) throw new Error("Metamask não encontrada!");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}
