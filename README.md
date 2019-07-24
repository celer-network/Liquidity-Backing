# cEconomy

[![CircleCI](https://circleci.com/gh/celer-network/cEconomy.svg?style=svg&circle-token=6900e01ac56042ac8161df6d2f9523d9ba4a3be9)](https://circleci.com/gh/celer-network/cEconomy)

-   [Overview](#overview)
-   [Latest Deployments](#latest-deployments)
-   [Core Concepts](#core-concepts)
-   [Release Features](#release-features)
-   [User Flow](#user-flow)
-   [Reward and Fee Calculation](#reward-and-fee-calculation)

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

## User Flow

### PoLC

1. **commitFund(\_tokenAddress, \_duration, \_value)**: Lock specific value of token into PoLC for a specific duration
2. **withdrawFund(\_commitmentId)**: Withdraw available fund from PoLC after the lock duration has passed
3. **withdrawReward(\_commitmentId)**: Withdraw reward from PoLC after the lock duration has passed

### LiBA

1. **initAuction(\_tokenAddress, \_bidDuration, \_revealDuration, \_claimDuration, \_challengeDuration, \_finalizeDuration, \_value, \_duration, \_maxRate, \_minValue, \_collateralAddress, \_collateralValue)**: An Authorized service provider starts an auction with specific token, value, and duration. It is optional to provide collateral with the auction
2. **placeBid(\_auctionId, \_hash, \_celerValue)**: During bidding period, a lender places a bid with claimed celer value and hash calculated from desired rate, value, actual celer value and salt.
3. **revealBid(\_auctionId, \_rate, \_value, \_celerValue, \_salt, \_commitmentId)**: During reveal period, the bidder reveals its bid with rate, value, celer value, salt, and commitmentId in PoLC. \*\*The commitment in PoLC should have enough available value to fullfil the bid.
4. **claimWinners(\_auctionId, \_winners)**: During claim period, the service provider submits winners list based on the rate and celer value. The lower rate will be selected. If rate is same, the bid with more celer value will be selected.
5. **challengeWinners(\_auctionId, \_winners)**: During challenge period, A lender, who is not selected as the winners but should be based on LiBA rules, can challenge the winners result. If the challenge is successful, the challenge period will be renewed.
6. **finalizeAuction(\_auctionId)**: During finalization period, anyone is able to finalize the auction, and the borrower of the auction will receive the asked fund.
7. **finalizeBid(\_auctionId)**: After the finalization period or the auction has been finalized, the unselected bider is able to collect celer value in the bid.
8. **repayAuction(\_auctionId)**: The borrower should repay the fund and interest when the lending duration is able to pass.
9. **collectCollateral(\_auctionId)**: If the borrower is not able to repay the fund and interest on time, the lender can collect collateral in the auction.

## Reward and Fee Calculation

### Term Definitions

-   Mining power of a commitment i -- Mi
-   Asset value of a commitment i -- Vi
-   Duration of a commitment i -- Ti
-   Reward by a block -- R
-   Reward for a commitment i by a given block -- Ri
-   Total mining power by a given block -- TMB
-   Total mining power for a duration -- TMD
-   Auction fee paid by a borrower -- AF
-   Auction value -- AV
-   Auction duration -- AD

### PoLC Reward Calculation

The mining power associated with a commitment is proportional to the asset value and lock duration. i.e. mining power will be the product of asset value and lock duration. For each block, it has a fixed reward. The reward for for a commitment by a given block will be the percent of its mining power to the total mining power by the given block.

-   Mi = Vi \* Ti
-   TMB = sum of Mining power of all commitments, which are locked in the current block
-   Ri = R \* Mi / TMB

### LiBA Auction Fee Calculation

The auction fee paid by a borrower is proportional to the value and duration of the intended loan. Another factor is total liquidity in PoLC, which can be represented by total mining power. If there is abundant liquidity in PoLC, the auction fee will be cheaper. Lastly, the auction fee needs to cover the total reward paid by PoLC in order to attract liquidity.

-   TMD = sum of TMB for blocks in the duration
-   AF = AV \* AD / TMD \* R \* AD
