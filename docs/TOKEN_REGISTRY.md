# Verified Token Registry — Pharos PayPilot

**Product:** Pharos PayPilot — Natural-Language Payment Agent  
**Verification Baseline:** Official Pharos Network Documentation (`docs.pharos.xyz/getting-started/token-registry`)  

---

## 1. Registry Architecture & Security Rules

To prevent address spoofing, phishing, and fake token attacks:
1. **Chain-Scoped Registry**: Every token is strictly tied to an EIP-155 `chainId`. A token verified on Base cannot be selected when transacting on Pharos.
2. **Official Provenance**: Token contracts must originate from official protocol documentation, verified explorers, or verified deployment factories (e.g. Circle for native USDC).
3. **Decimals Immutability**: Decimals are strictly defined in the registry. No on-the-fly decimal guessing is permitted.
4. **Denial of Arbitrary Contracts**: An unverified contract address supplied via natural language prompt is rejected with an explicit warning.

---

## 2. Verified Token Directory

### 2.1 Pharos Pacific Mainnet (Chain ID `1672`)
- **Native Gas Asset**: `PROS` (18 decimals)
- **Explorer**: `https://www.pharosscan.xyz`

| Symbol | Name | Contract Address | Decimals | Verification Source |
| :--- | :--- | :--- | :--- | :--- |
| **PROS** | Pharos Native Gas | `0x0000000000000000000000000000000000000000` | 18 | Pharos Canonical Protocol Gas Specification |
| **USDC** | USD Coin (Circle Deployed) | `0xc879c018db60520f4355c26ed1a6d572cdac1815` | 6 | Pharos Official Token Registry (docs.pharos.xyz) |
| **WPROS** | Wrapped PROS | `0x52c48d4213107b20bc583832b0d951fb9ca8f0b0` | 18 | Pharos Official Token Registry (docs.pharos.xyz) |
| **LINK** | Chainlink Token | `0x51e2A24742Db77604B881d6781Ee16B5b8fcBE29` | 18 | Pharos Official Token Registry (docs.pharos.xyz) |
| **WETH** | Wrapped Ether | `0x1f4b7011Ee3d53969bb67F59428a9ec0477856E9` | 18 | Pharos Official Token Registry (docs.pharos.xyz) |

### 2.2 Pharos Atlantic Testnet (Chain ID `688689`)
- **Native Gas Asset**: `PROS` (18 decimals)
- **Explorer**: `https://atlantic.pharosscan.xyz/`

| Symbol | Name | Contract Address | Decimals | Verification Source |
| :--- | :--- | :--- | :--- | :--- |
| **PROS** | Testnet PROS Native | `0x0000000000000000000000000000000000000000` | 18 | Pharos Atlantic Protocol Specification |
| **USDC** | USD Coin (Testnet) | `0xcfC8330f4BCAB529c625D12781b1C19466A9Fc8B` | 6 | Atlantic Testnet Token Registry (docs.pharos.xyz) |
| **USDT** | Tether USD (Testnet) | `0xE7E84B8B4f39C507499c40B4ac199B050e2882d5` | 6 | Atlantic Testnet Token Registry (docs.pharos.xyz) |
| **WBTC** | Wrapped BTC (Testnet) | `0x0c64F03EEa5c30946D5c55B4b532D08ad74638a4` | 18 | Atlantic Testnet Token Registry (docs.pharos.xyz) |
| **WETH** | Wrapped ETH (Testnet) | `0x7d211F77525ea39A0592794f793cC1036eEaccD5` | 18 | Atlantic Testnet Token Registry (docs.pharos.xyz) |
| **WPHRS**| Wrapped PHRS (Testnet)| `0x838800b758277CC111B2d48Ab01e5E164f8E9471` | 18 | Atlantic Testnet Token Registry (docs.pharos.xyz) |

### 2.3 Base Mainnet (Chain ID `8453`)
- **Native Gas Asset**: `ETH` (18 decimals)
- **Explorer**: `https://basescan.org`

| Symbol | Name | Contract Address | Decimals | Verification Source |
| :--- | :--- | :--- | :--- | :--- |
| **ETH** | Ether Native Gas | `0x0000000000000000000000000000000000000000` | 18 | Base Protocol Specification |
| **USDC** | USD Coin (Native) | `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` | 6 | Base Official Circle Deployment (basescan.org) |
| **cbBTC**| Coinbase Wrapped BTC | `0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf` | 8 | Coinbase Verified Contract |
| **WETH** | Wrapped Ether | `0x4200000000000000000000000000000000000006` | 18 | Base Canonical WETH9 |
