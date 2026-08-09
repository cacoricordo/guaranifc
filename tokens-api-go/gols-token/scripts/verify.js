import hre from "hardhat";

async function main() {
  await hre.run("verify:verify", {
    address: "0xfC6526BF078CC632a9564741dA6dDC11ecA896b4",
    constructorArguments: [],
  });
}

main().catch(console.error);
