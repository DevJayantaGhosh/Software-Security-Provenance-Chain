/**
 * Standalone ABI Extraction Utility
 *
 * Extracts the ABI from compiled Hardhat artifacts and saves it
 * as a clean JSON file ready for frontend / backend integration.
 *
 * Usage:
 *   npx hardhat compile          (compile first)
 *   node scripts/extract-abi.js  (then extract)
 */
const fs = require("fs");
const path = require("path");

const CONTRACT_NAME = "ProductRegistry";

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  `${CONTRACT_NAME}.sol`,
  `${CONTRACT_NAME}.json`
);

if (!fs.existsSync(artifactPath)) {
  console.error(
    `❌ Artifact not found at ${artifactPath}\n   Run 'npx hardhat compile' first.`
  );
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

// ── Save ABI ────────────────────────────────────────
const abiDir = path.join(__dirname, "..", "abi");
if (!fs.existsSync(abiDir)) {
  fs.mkdirSync(abiDir, { recursive: true });
}

const abiFile = path.join(abiDir, `${CONTRACT_NAME}.abi.json`);
fs.writeFileSync(abiFile, JSON.stringify(artifact.abi, null, 2));
console.log(`✅ ABI saved to: ${abiFile}`);

// ── Save Bytecode (useful for programmatic deployments) ──
const bytecodeFile = path.join(abiDir, `${CONTRACT_NAME}.bytecode.json`);
fs.writeFileSync(
  bytecodeFile,
  JSON.stringify({ bytecode: artifact.bytecode }, null, 2)
);
console.log(`✅ Bytecode saved to: ${bytecodeFile}`);

console.log(`\n   Functions in ABI: ${artifact.abi.filter((e) => e.type === "function").length}`);
console.log(`   Events   in ABI: ${artifact.abi.filter((e) => e.type === "event").length}`);