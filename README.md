# cEconomy

[![CircleCI](https://circleci.com/gh/celer-network/cEconomy.svg?style=svg&circle-token=6900e01ac56042ac8161df6d2f9523d9ba4a3be9)](https://circleci.com/gh/celer-network/cEconomy)

-   [Overview](https://github.com/celer-network/cEconomy#overview)
-   [Latest Deployments](https://github.com/celer-network/cEconomy#latest-deployments)
-   [Core Concepts](https://github.com/celer-network/cEconomy#core-concepts)
-   [Release Features](https://github.com/celer-network/cEconomy#release-features)
-   [License](https://github.com/celer-network/cEconomy#license)

## Overview

cEcnonomy is an cryptoeconomics mechanisms to enable off-chain service providers to tap into large amounts of liquidity whenever they need to. It consists Proof of Liquidity Commitment (PoLC) and Liquidity Backing Auction (LiBA). PoLC encourage Network Liquidity Backers (NLB) to lock their digital assets into smart contract for a long time by rewarding them with CELR tokens and therefore establishing a stable and abundant liquidity pool. LiBA enables off-chain service providers to solicit liquidity in PoLC through “crowd lending”.

For more details about cEcnonomy and Celer Network, please refer to [Celer Network's official website](https://www.celer.network/).

## Latest Deployments

### Ropsten

#### PoLC

-   Contract address: [0x66804e13b02d2d2d4174ae3b538bf968411bb6c1](https://ropsten.etherscan.io/address/0x66804e13b02d2d2d4174ae3b538bf968411bb6c1)
-   Deployed code: [PoLC.sol](https://github.com/celer-network/cEconomy/blob/v0.11.0/contracts/CelerChannel.sol)

#### LiBA

-   Contract address: [0x66804e13b02d2d2d4174ae3b538bf968411bb6c1](https://ropsten.etherscan.io/address/0x66804e13b02d2d2d4174ae3b538bf968411bb6c1)
-   Deployed code: [LiBA.sol](https://github.com/celer-network/cEconomy/blob/v0.11.0/contracts/CelerChannel.sol)

### Alpha Mainnet

#### PoLC

-   Contract address: [0x66804e13b02d2d2d4174ae3b538bf968411bb6c1](https://ropsten.etherscan.io/address/0x66804e13b02d2d2d4174ae3b538bf968411bb6c1)
-   Deployed code: [PoLC.sol](https://github.com/celer-network/cEconomy/blob/v0.11.0/contracts/CelerChannel.sol)

#### LiBA

-   Contract address: [0x66804e13b02d2d2d4174ae3b538bf968411bb6c1](https://ropsten.etherscan.io/address/0x66804e13b02d2d2d4174ae3b538bf968411bb6c1)
-   Deployed code: [LiBA.sol](https://github.com/celer-network/cEconomy/blob/v0.11.0/contracts/CelerChannel.sol)

## Core Concepts

-   **Off-chain Service Provider(OSP)**: Service provider running Celer node
-   **Network Liquidity Backer(NLB)**: Users who lock fund into PoLC and lend out through LiBA
-   **Collateral Commitment Contract(CCC)**: Contract holding locked digital assets

## Release Features

-   **Multiple Token Support**: Support multiple tokens for liquidity backing. The owner is able to add or remove supported tokens
-   **Pausable**: PoLC and LiBA can be paused by the owner in case of emergency.
-   **Drainable**: Fund in PoLC and LiBA can be withdrawn by the owner in case of emergency.
-   **Locked Commiment**: Lock digital asset into PoLC for a specific period to collect reward
-   **Lockfree Commiment**: Put digital asset into PoLC without locking
-   **Whitelist OSP**: Only OSP in the whitelist can launch LiBA auction to borrow fund
-   **Collateral Lending**: OSP can put collateral into the auction
-   **Blind Auction**: Bidders will not know others' rate and celer value for auction performed in LiBA
-   **Challenge Auction Result**: Bidders can challenge wrong auction result posted by OSP
-   **Repay Auction**: OPS can repay the loan through LiBA
