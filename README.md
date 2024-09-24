## Table of Contents
- [About](#-about)
- [Key Features](#-key-features)
- [Installation](#-installation)
- [Prerequisites](#-prerequisites)
- [Feedback and Contributions](#-feedback-and-contributions)
- [Credits](#-credits)
- [Disclaimer](#-disclaimer)
- [Documentation](https://outsmartchad.github.io/solana-trading-cli/)

## 🚀 About

**Solana Trading Client** is a free, highly efficient library designed to facilitate rapid development and deployment of custom trading strategies across multiple Solana decentralized exchanges (DEXs). It emphasizes low-latency performance, flexibility, and real-time data processing, utilizing cutting-edge infrastructure and well-established software design principles. These features ensure the following benefits:

* **Speed:** Leverages low-latency infrastructures like Jito and BloXroute to minimize trade execution times, giving your strategies a competitive edge.
* **Versatility:** Supports multiple DEXs, allowing for diverse trading opportunities and cross-platform arbitrage.
* **Real-time Insights:** Fetches and processes real-time live metrics using gRPC from liquidity pools, enabling data-driven decision making.

The library is built with modularity and extensibility in mind, employing software design patterns that promote:

* **Customizability:** Easily integrate your own trading strategies and extend the bot's functionality.
* **Testability:** Well-separated components facilitate comprehensive testing of individual modules.
* **Maintainability:** Clear structure and separation of concerns simplify ongoing development and updates.

Designed for seamless integration into existing trading systems, the Open-Source Low-Latency Trading Bot provides a robust foundation for both novice algo-traders and experienced quantitative analysts. Its open-source nature encourages community contributions and continuous improvement, ensuring the bot evolves alongside the fast-paced world of decentralized finance.
  
## ⭐ Key Features

### Token Creation and Multi-DEX Support
Create your own Solana SPL tokens on mainnet via Pump.fun and swap tokens across multiple decentralized exchanges:

| Exchange | Documentation |
|----------|---------------|
| Jupiter  | [CLI & trading functions guide](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/jupiter/README.md) |
| Raydium   | [CLI & trading functions guide](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/raydium/README.md) |
| Orca      | [CLI & trading functions guide](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/orca/README.md) |
| Meteora   | [CLI & trading functions guide](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/meteora/README.md) |
| Pump.fun  | Integrated support |

### Low-Latency Infrastructure
Accelerate transaction finality using Jito and bloXroute for lightning-fast trades. Both capable of pushing your trasaction faster then any other service provider on the market

| Provider | Description |
|----------|---------------|
| Jito      | Fast trascation and optimizes transaction ordering and execution specifically |
| Bloxroute | Fast trascation and accelerates transaction propagation |

### Real-Time Market Data
Fetch critical metrics for any liquidity pool in real-time with RPC calls:
- Price
- LP-burn percentage
- Pool reserve
- Market cap

### Advanced Trading Tools
Utilize our local limit order and TP/SL module with zero dependencies. 
[Explore the documentation](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/trading_dev/README.md)

### Open-Source Bots
Leverage our cutting-edge, open-source trading bots:

| Bot Name | Features | Source |
|----------|----------|--------|
| gRPC Pump.fun Sniper Bot | Ultra-low latency (0.4-2 seconds) | [View source](https://github.com/outsmartchad/solana-trading-cli/tree/typescript-main/src/grpc_streaming_dev/grpc-pf-sniper) |
| gRPC Copy Bot | Replicate successful trading strategies | [View source](https://github.com/outsmartchad/solana-trading-cli/tree/typescript-main/src/grpc_streaming_dev/grpc-copy-bot) |
| gRPC Raydium Sniper Bot | Optimized for Raydium DEX | [View source](https://github.com/outsmartchad/solana-trading-cli/tree/typescript-main/src/grpc_streaming_dev/grpc-raydium-sniper) |

### Extensibility
Our comprehensive toolkit provides everything you need to create your own custom trading bot, tailored to your unique strategies and requirements.

## 🛠️ Installation
Follow these steps to get your development environment set up:

1. **Clone the repository**
   ```bash
   git clone https://github.com/outsmartchad/solana-trading-cli.git
   ```

2. **Navigate to the project directory**
   ```bash
   cd solana-trading-cli
   ```

3. **Install the correct Node.js version**
   ```bash
   nvm install
   nvm use
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Run the test script**
   ```bash
   ts-node test.ts
   ```

### Installation Prerequisites

- [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm)
- [Node.js](https://nodejs.org/) (version specified in `.nvmrc`)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Troubleshooting

If you encounter any issues during installation, please check our [FAQ](link-to-faq) or [open an issue](https://github.com/outsmartchad/solana-trading-cli/issues).

## 🚨 Set Up 

Before you begin, ensure you have completed the following steps:

### 1. Environment Configuration

1. Locate the template file:
   ```
   src/helpers/.env.copy
   ```

2. Copy this file and rename it to `.env` in the same directory.

3. Open the `.env` file and add the following required information:
   - Mainnet wallet secret key (required)
   - RPC endpoint (required)
   - Custom Jito fee (if needed)

4. Optional configurations:
   - Devnet wallet secret key
   - Shyft API key

### 2. API Keys and Wallet Setup

- **Mainnet Wallet**: Ensure you have a funded Solana mainnet wallet. The secret key is required for mainnet transactions.
- **RPC Endpoint**: Obtain a reliable RPC endpoint for connecting to the Solana network.
- **Jito Integration**: If using Jito, prepare your custom fee configuration.
- **Devnet Wallet** (Optional): For testing purposes, set up a devnet wallet.
- **Shyft API** (Optional): If you plan to use Shyft services, obtain an API key from [Shyft](https://shyft.to/).

### 3. Final Check

- Confirm that your `.env` file is properly configured and saved.
- Ensure the `.env` file is in the correct location: `src/helpers/.env`
- Verify that you haven't accidentally committed your `.env` file to version control.

> ⚠️ **Security Note**: Never share or commit your `.env` file or any private keys. The `.env` file is included in `.gitignore` for your safety.

For any issues with configuration, please refer to our [Troubleshooting Guide](link-to-troubleshooting) or [open an issue](https://github.com/yourusername/your-repo-name/issues).

## 🤝 Feedback and Contributions
We've made every effort to implement all the main aspects of solana trading in the best possible way. However, the development journey doesn't end here, and your input is crucial for our continuous improvement.

> [!IMPORTANT]
> Whether you have feedback on features, have encountered any bugs, or have suggestions for enhancements, we're eager to hear from you. Your insights help us make the Solana Trading Client library more robust and user-friendly.

Please feel free to contribute by submitting an issue, joining the discussions, or joining our discord. Each contribution helps us grow and improve.

We appreciate your support and look forward to making our product even better with your help!

### How to Contribute

- Contributions is wellcome!!!
- Fork it
- `git checkout -b feature/YourNewFeature`
- `git commit -m 'bug Fixed/added new feature'`
- `git push origin feature/YourNewFeature`
- And Please open a pull request

### Apply Latest Changes from remote repo

- `git stash -u  # Stash your changes`
- `git pull --rebase # Pull the latest changes`
- `git stash pop # Apply Your stashed changes`

## ✅ Credits

- https://github.com/raydium-io/raydium-sdk-V2
- https://github.com/rckprtr/pumpdotfun-sdk
- https://github.com/Al366io/solana-transactions-wrapper

## ‼️ Disclaimer

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

**Use at your own risk.** The authors take no responsibility for any harm or damage caused by the use of this software. Users are responsible for ensuring the suitability and safety of this software for their specific use cases.

By using this software, you acknowledge that you have read, understood, and agree to this disclaimer.

### If you think this project is useful, please give us a star🌟, it will help us a lot.

### Discord channel: https://discord.gg/hFhQeBCqWX

### It is a work in progress, if you have any suggestions or any problems, please let us know!

### **_Stay tuned for the updates.🤖_**
