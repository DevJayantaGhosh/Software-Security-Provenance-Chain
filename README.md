# Software Security Provenance Chain

> Immutable Blockchain provenance for software products — deployed on **Hedera Testnet** using Hardhat.

## Overview

This project records three lifecycle stages of a software product on-chain, creating an immutable audit trail from security scan through code signing to final release.

## Architecture

### 1. Contract Deployment

```
+------------------------------------------------------------+
|                    Developer Machine                        |
|                                                             |
|  +--------------------+     +---------------------------+   |
|  | Solidity Source     |--->| Hardhat Compile (solc)    |   |
|  | (.sol contracts)    |    | --> ABI + Bytecode        |   |
|  +--------------------+     +-------------+-------------+   |
|                                          |                  |
|                                          v                  |
|                            +---------------------------+    |
|                            | Local Hardhat Network      |   |
|                            | (Test & Verify Locally)    |   |
|                            +-------------+-------------+    |
|                                          |                  |
|                                          | npm run          |
|                                          | deploy:hedera    |
+------------------------------------------+------------------+
                                           |
                                           | JSON-RPC (HTTPS)
                                           | Signed Transaction
                                           v
+------------------------------------------------------------+
|                    Hedera Testnet (EVM)                     |
|                    Chain ID: 296                            |
|                    RPC: testnet.hashio.io/api               |
|                                                             |
|  +------------------------------------------------------+   |
|  |           ProductRegistry Contract                    |  |
|  |           (Deployed & Immutable)                      |  |
|  +------------------------------------------------------+   |
|                                                             |
|  Verify: https://hashscan.io/testnet                        |
+------------------------------------------------------------+
```

### 2. Product Distribution Pipeline — Provenance Recording

```
+----------------------------------------------------------------------+
|                   Product Distribution Pipeline                       |
|                                                                       |
|  +----------------+    +----------------+    +------------------+     |
|  | STAGE 1        |    | STAGE 2        |    | STAGE 3          |     |
|  | SCAN           |--->| SIGN           |--->| RELEASE          |     |
|  |                |    |                |    |                  |     |
|  | Security       |    | Code           |    | Final            |     |
|  | Analysis       |    | Signing        |    | Distribution     |     |
|  |                |    |                |    |                  |     |
|  | - CVE Scan     |    | - IPFS Hash    |    | - Version        |     |
|  | - Approved/    |    | - Signature    |    | - Checksum       |     |
|  |   Rejected     |    | - PublicKey    |    | - Artifact       |     |
|  +-------+--------+    +-------+--------+    +---------+--------+     |
|          |                      |                       |             |
+----------+----------------------+-----------------------+-------------+
           |                      |                       |
           | recordProduct()      | recordProduct()       | recordProduct()
           | status: SCAN         | status: SIGN          | status: RELEASE
           |                      |                       |
           v                      v                       v
+----------------------------------------------------------------------+
|                                                                       |
|                    Hedera Testnet Blockchain                          |
|                    (ProductRegistry Contract)                         |
|                                                                       |
|  +------------------+  +------------------+  +-------------------+    |
|  | Snapshot #1       |  | Snapshot #2       |  | Snapshot #3        | |
|  |                   |  |                   |  |                    | |
|  | productId         |  | productId         |  | productId          | |
|  | version           |  | version           |  | version            | |
|  | status: Approved  |  | status: Signed    |  | status: Released   | |
|  | ipfsHash          |  | ipfsHash          |  | ipfsHash           | |
|  | cveReport         |  | publicKey         |  | checksum           | |
|  |                   |  |                   |  |                    | |
|  | Event:            |  | Event:            |  | Event:             | |
|  | ProductScanned    |  | ProductSigned     |  | ProductReleased    | |
|  +------------------+  +------------------+  +-------------------+    |
|                                                                       |
|  All snapshots are IMMUTABLE -- stored permanently on-chain           |
|                                                                       |
+----------------------------------+------------------------------------+
                                   |
                                   | View Functions (read-only)
                                   | getSnapshot() / getAllSnapshots()
                                   v
+----------------------------------------------------------------------+
|                    Frontend / Auditor / Verifier                      |
|                                                                       |
|  - Query full provenance chain for any productId                      |
|  - Verify security scan status before using software                  |
|  - Confirm code signature authenticity                                |
|  - Validate release integrity via on-chain checksum                   |
+----------------------------------------------------------------------+
```

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A **Hedera Testnet** account with ECDSA keys and testnet HBAR
  - Create one at [Hedera Portal](https://portal.hedera.com/)
  - Fund it with the portal's built-in faucet

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your private key:

```env
HEDERA_TESTNET_ENDPOINT=https://testnet.hashio.io/api
SERVICE_ACCOUNT_PRIVATE_KEY=your_ecdsa_private_key_here
```

### 3. Compile the Contract

```bash
npm run compile
```

ABI and bytecode are generated in `artifacts/contracts/ProductRegistry.sol/ProductRegistry.json`.

### 4. Deploy to Local Hardhat Network (test first)

```bash
npm run deploy:local
```

### 5. Deploy to Hedera Testnet

```bash
npm run deploy:hedera
```

### 6. Verify on HashScan

After deploying to Hedera Testnet, verify your contract at:

```
https://hashscan.io/testnet/contract/<YOUR_CONTRACT_ADDRESS>
```

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy:local` | Deploy to local Hardhat network |
| `npm run deploy:hedera` | Deploy to Hedera Testnet |
| `npm run extract-abi` | Extract ABI from compiled artifacts |
| `npm test` | Run Hardhat tests |
| `npm run clean` | Clean Hardhat cache and artifacts |

## Smart Contract Interface

| Function | Access | Description |
|----------|--------|-------------|
| `addServiceAccount(address)` | Owner only | Authorize an address to record products |
| `removeServiceAccount(address)` | Owner only | Revoke service account access |
| `recordProduct(ProductSnapshot)` | Service accounts | Record a lifecycle snapshot (SCAN→SIGN→RELEASE) |
| `getSnapshot(productId, index)` | Public (view) | Get a specific snapshot by index |
| `getAllSnapshotsByProductId(productId)` | Public (view) | Get all snapshots for a product |
| `getSnapshotCount(productId)` | Public (view) | Get number of recorded snapshots |

## Hedera Testnet Info

| Property | Value |
|----------|-------|
| Chain ID | `296` |
| JSON-RPC | `https://testnet.hashio.io/api` |
| Explorer | [HashScan Testnet](https://hashscan.io/testnet) |
| Portal | [portal.hedera.com](https://portal.hedera.com/) |

## Author

**Jayanta Ghosh** | IIT Madras | CS23M513

## License

UNLICENSED