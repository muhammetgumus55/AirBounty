import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying DroneTask contract...");
  console.log("Deployer address:", deployer.address);

  const DroneTask = await ethers.getContractFactory("DroneTask");
  const droneTask = await DroneTask.deploy();

  const deployTx = droneTask.deploymentTransaction();
  console.log("Transaction hash:", deployTx?.hash);

  await droneTask.waitForDeployment();
  // Additional confirmation wait on top of the default
  if (deployTx) {
    await deployTx.wait(2);
  }

  const address = await droneTask.getAddress();
  console.log("DroneTask deployed to:", address);

  const envLine = `DRONE_TASK_ADDRESS=${address}\n`;
  fs.writeFileSync(path.join(__dirname, "../.env.deployed"), envLine, { flag: "w" });
  console.log("Contract address written to .env.deployed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
