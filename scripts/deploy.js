/**
 * Deploy ProductRegistry to Hedera Testnet (or local Hardhat network).
 *
 * Usage:
 *   Local:   npx hardhat run scripts/deploy.js
 *   Hedera:  npx hardhat run scripts/deploy.js --network hederaTestnet
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function printBanner() {
  console.log("");
  console.log("  ╔════════════════════════════════════════════════════╗");
  console.log("  ║                                                    ║");
  console.log("  ║      Software Security Provenance Chain            ║");
  console.log("  ║                                                    ║");
  console.log("  ║     Jayanta Ghosh | IIT Madras | CS23M513          ║");
  console.log("  ║                                                    ║");
  console.log("  ╚════════════════════════════════════════════════════╝");
  console.log("");
}

async function main() {
  printBanner();

  console.log("  ┌════════════════════════════════════════════════════┐");
  console.log("  │           CONTRACT DEPLOYMENT                      │");
  console.log("  └════════════════════════════════════════════════════┘");
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();

  console.log("  Network          : " + network);
  console.log("  Chain ID         : " + chainId);
  console.log("  Deployer         : " + deployer.address);
  console.log("  Balance          : " + hre.ethers.formatEther(balance) + " " + (network === "hederaTestnet" ? "HBAR" : "ETH"));
  console.log("");

  // Deploy — explicit gasLimit bypasses relay gas estimation (avoids INSUFFICIENT_TX_FEE)
  console.log("  Deploying ProductRegistry contract...");
  console.log("");
  const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
  const registry = await ProductRegistry.deploy({
    gasLimit: 3_000_000,
  });
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();

  console.log("  ┌════════════════════════════════════════════════════┐");
  console.log("  │             DEPLOYMENT SUCCESSFUL                  │");
  console.log("  └════════════════════════════════════════════════════┘");
  console.log("");
  console.log("  Contract Name    : ProductRegistry");
  console.log("  Contract Address : " + contractAddress);

  if (network === "hederaTestnet") {
    console.log("  HashScan         : https://hashscan.io/testnet/contract/" + contractAddress);
  }

  // ── Verify deployer is auto-registered as service account (via constructor) ──
  console.log("");
  const isService = await registry.serviceAccounts(deployer.address);
  console.log("  Service Account  : " + (isService ? "ACTIVE" : "NOT REGISTERED"));

  // ── Save deployment info ──────────────────────────
  const deploymentInfo = {
    network: network,
    chainId: chainId,
    contractName: "ProductRegistry",
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${network}-deployment.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("");
  console.log("  Deployment Saved : " + deploymentFile);

  // ── Extract & save ABI ────────────────────────────
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "ProductRegistry.sol",
    "ProductRegistry.json"
  );

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiDir = path.join(__dirname, "..", "abi");
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }
    const abiFile = path.join(abiDir, "ProductRegistry.abi.json");
    fs.writeFileSync(abiFile, JSON.stringify(artifact.abi, null, 2));
    console.log("");
    console.log("  ABI Saved        : " + abiFile);
  }

  console.log("");
  console.log("  ╔════════════════════════════════════════════════════╗");
  console.log("  ║     Software Security Provenance Chain deployed!   ║");
  console.log("  ╚════════════════════════════════════════════════════╝");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("  ┌════════════════════════════════════════════════════┐");
    console.error("  │             DEPLOYMENT FAILED                      │");
    console.error("  └════════════════════════════════════════════════════┘");
    console.error("");
    console.error(" ", error);
    process.exit(1);
  });