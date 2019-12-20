# Liquidity Backing

[![CircleCI](https://circleci.com/gh/celer-network/Liquidity-Backing.svg?style=svg&circle-token=6900e01ac56042ac8161df6d2f9523d9ba4a3be9)](https://circleci.com/gh/celer-network/Liquidity-Backing)

-   [Overview](#overview)
-   [Latest Deployments](#latest-deployments)
-   [Core Concepts](#core-concepts)
-   [Release Features](#release-features)
-   [User Flow](#user-flow)

## Overview

Liquidity Backing is a cryptoeconomics mechanism to enable off-chain service providers (OSP) to tap into large amounts of liquidity to support and expand their off-chain payment relay services. It consists of Proof of Liquidity Commitment (PoLC) and Liquidity Backing Auction (LiBA) processes. PoLC encourages Network Liquidity Backers (NLB) to lock their digital assets into a smart contract for a long time by rewarding them with CELR tokens and therefore establishing a stable and abundant liquidity pool. LiBA enables OSPs to solicit liquidity in PoLC through crowdlending whenever they need to.

For more details about Liquidity Backing, please refer to [CelerCore technical documentation](https://www.celer.network/docs/celercore/liquidity/problem.html).

## Latest Deployments

### Ropsten

#### PoLC

-   Contract address: [0x2e0213d303d9e0caa4090915a1afe1767953302a](https://ropsten.etherscan.io/address/0x2e0213d303d9e0caa4090915a1afe1767953302a)
-   Deployed code: [PoLC.sol](https://github.com/celer-network/Liquidity-Backing/blob/3320021cde9317363256f68dd851d57f27357bdd/contracts/PoLC.sol)

#### LiBA

-   Contract address: [0x4191b20f182f0853bd51b5b4852cc794dae06899](https://ropsten.etherscan.io/address/0x4191b20f182f0853bd51b5b4852cc794dae06899)
-   Deployed code: [LiBA.sol](https://github.com/celer-network/Liquidity-Backing/blob/3320021cde9317363256f68dd851d57f27357bdd/contracts/LiBA.sol)

## Core Concepts

-   **Off-chain Service Provider(OSP)**: Service provider running Celer node
-   **Network Liquidity Backer(NLB)**: Users who lock fund into PoLC and lend out through LiBA

## Release Features

-   **Multiple Token Support**: Support multiple tokens for liquidity backing. The owner is able to add or remove supported tokens
-   **Pausable**: PoLC and LiBA can be paused by the owner in case of emergency.
-   **Drainable**: Fund in PoLC and LiBA can be withdrawn by the owner in case of emergency.
-   **Locked Commiment**: Lock digital asset into PoLC for a specific period to collect reward
-   **Lockfree Commiment**: Put digital asset into PoLC without locking
-   **Whitelist OSP**: Only OSP in the whitelist can launch LiBA auction to borrow fund
-   **Collateral Lending**: OSP can put collateral into the auction
-   **Blind Auction**: Bidders will not know others' rate and CELR value for auction performed in LiBA
-   **Challenge Auction Result**: Bidders can challenge wrong auction result posted by OSP
-   **Repay Auction**: OPS can repay the loan through LiBA

## User Flow

### PoLC

1. **commitFund(\_tokenAddress, \_duration, \_value)**: Lock specific value of token into PoLC for a specific duration
2. **withdrawFund(\_commitmentId)**: Withdraw available fund from PoLC after the lock duration has passed
3. **withdrawReward(\_commitmentId)**: Withdraw reward from PoLC after the lock duration has passed

### LiBA

1. **initAuction(\_tokenAddress, \_bidDuration, \_revealDuration, \_claimDuration, \_challengeDuration, \_finalizeDuration, \_value, \_duration, \_maxRate, \_minValue, \_collateralAddress, \_collateralValue)**: An Authorized service provider starts an auction with specific token, value, and duration. It is optional to provide collateral with the auction. It also need to provide duration for each period.
2. **placeBid(\_auctionId, \_hash, \_celerValue)**: During bidding period, a lender places a bid with claimed CELR value and hash calculated from desired rate, value, actual CELR value and salt.
3. **revealBid(\_auctionId, \_rate, \_value, \_celerValue, \_salt, \_commitmentId)**: During reveal period, the bidder reveals its bid with rate, value, CELR value, salt, and commitmentId in PoLC. \*\*The commitment in PoLC should have enough available value to fullfil the bid.
4. **claimWinners(\_auctionId, \_winners)**: During claim period, the service provider submits winners list based on the rate and CELR value. The lower rate will be selected. If rate is same, the bid with more CELR value will be selected.
5. **challengeWinners(\_auctionId, \_winners)**: During challenge period, A lender, who is not selected as the winners but should be based on LiBA rules, can challenge the winners result. If the challenge is successful, the challenge period will be renewed.
6. **finalizeAuction(\_auctionId)**: During finalization period, anyone is able to finalize the auction, and the auction asker will receive the asked fund. LiBA will also refund excessive fund from winner bids. Wen the auction is finalized, LiBA will collect feeDeposit from the auction asker. The fee deposit is sum of the reward of each winner bid commitment in PoLC.
7. **finalizeBid(\_auctionId)**: After the finalization period or the auction has been finalized, the unselected bider is able to collect CELR value and commitment value in the bid.
8. **repayAuction(\_auctionId)**: The auction asker should repay the fund and interest when the lending duration is about to end. LiBA will refund the feeDeposit to the auction asker, the auction asker also needs to make the payment for auction fee, which is discussed in detail below.
9. **collectCollateral(\_auctionId)**: If the auction asker is not able to make the repayment on time, the lender can collect collateral associated with the auction.
