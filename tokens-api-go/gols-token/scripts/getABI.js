// scripts/getABI.js
import fs from "fs";

const path = "./artifacts/contracts/GOLS.sol/GOLS.json";
const file = JSON.parse(fs.readFileSync(path, "utf8"));
const abi = file.abi;

// salva para usar no frontend:
fs.writeFileSync(
  "erc20_gols.js",
  `window.GOLS_ERC20_ABI = ${JSON.stringify(abi, null, 2)};`
);

console.log("🔥 ABI REAL EXTRAÍDO dos artifacts e salvo em: erc20_gols.js");
