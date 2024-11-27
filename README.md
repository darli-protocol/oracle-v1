# Darli Oracle v1
<p align="center">
<image src="https://raw.githubusercontent.com/darli-protocol/.github/main/asset/darli-logo.png" width = "150">
</p>

**Real-Time On Chain Price Feeds for Web3**

The Darli Price Feed is a Solidity implementation of an immutable Oracle Factory contract that allows anyone to deploy a new Oracle. Each Oracle contract allows Darli governance token holders to participate in price voting by staking tokens in a pool. The Oracle keeps track of staked tokens and allows Darli token holders to vote on a price, which can then be retrieved by other contracts.

## Features
* **Real-Time Price Updates:** Access accurate and up-to-date pricing data.
* **Blockchain Integration:** Easily integrate with popular blockchain platforms.
* **Decentralized Security:** Built with safety measures to prevent data tampering.
* **Scalable Architecture:** Supports high-traffic environments with low latency.
* **Customizable Sources:** Fetch data from multiple predefined or custom sources.


## Getting Started

### Prerequisites

- Node.js >= 16.x
- NPM >= 8.x
- Docker (optional, for deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/darli-protocol/oracle-v1.git
   cd oracle-v1
   npm install
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Test folder demonstrates a test for Oracle contract, and a Hardhat Ignition module that deploys that contract.
Try running some of the following tasks:

    ```shell
    npx hardhat test
    REPORT_GAS=true npx hardhat test
    ```

4. Set up environment variables: Create a .env file based on .env.example and update it with your API keys and configuration:
   ```bash
   cp .env.example .env
   ```

## Structure
### Oracle Factory Contract
A factory contract to deploy new Oracle contracts.

### Oracle Contract
The core contract for price voting by staked Darli governance token holders.

### Reporter CLI
This package includes a CLI script for deploying the latest Darli Oracle V1 smart contracts to any EVM (Ethereum Virtual Machine) compatible network.

### Reporter SDK
This repository contains a set of SDKs for reporters to easily publish "reporter" data in any supported languages. We currently support the following languages:
* JavaScript

## Contributing
Note: all code contributed to this repository must be licensed under each of 1. MIT, 2. BSD-3, and 3. GPLv3. By contributing code to this repository, you accept that your code is allowed to be released under any or all of these licenses or licenses in substantially similar form to these listed above.

Please submit an issue (or create a pull request) for any issues or contributions to the project. Make sure that all test cases pass, including the integration tests in the root of this project.

## Acknowledgments
Special thanks to the contributors and the open-source community for their support and feedback!