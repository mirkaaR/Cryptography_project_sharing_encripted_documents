const hre = require("hardhat");

async function main() {
  console.log(" Deploying SecureStorage contract...");

  const SecureStorage = await hre.ethers.getContractFactory("SecureStorage");
  const contract = await SecureStorage.deploy();

  await contract.waitForDeployment();

  console.log(` SecureStorage deployed at: ${contract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
