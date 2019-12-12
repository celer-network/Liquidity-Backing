const POLL_INTERVAL = 1000;

export const subscribeEvent = (account, contracts, dispatch) => {
    const { PoLC, LiBA, ERC20ExampleToken } = contracts;

    PoLC.events.NewCommitment(
        {
            fromBlock: 0,
            filter: {
                user: account
            }
        },
        (err, event) => {
            if (err) {
                return;
            }

            const { commitmentId, user } = event.returnValues;
            PoLC.methods.commitmentsByUser.cacheCall(user, commitmentId);
        }
    );

    LiBA.events.NewAuction(
        {
            fromBlock: 0
        },
        (err, event) => {
            if (err) {
                return;
            }

            const { auctionId } = event.returnValues;
            LiBA.methods.getAuction.cacheCall(auctionId);
            LiBA.methods.getAuctionPeriod.cacheCall(auctionId);
        }
    );

    LiBA.events.NewBid(
        {
            fromBlock: 0,
            filter: {
                bidder: account
            }
        },
        (err, event) => {
            if (err) {
                return;
            }

            const { auctionId } = event.returnValues;
            dispatch({
                type: 'LiBA/addBid',
                payload: { auctionId }
            });
        }
    );

    ERC20ExampleToken.events.Approval(
        {
            filter: {
                owner: account,
                spender: LiBA.address
            }
        },
        (err, event) => {
            if (err) {
                return;
            }

            getCelrAllowance(account, contracts);
        }
    );

    getCelrAllowance(account, contracts);
};

export const subscribeChainInfo = (web3, dispatch) => {
    const account = web3.currentProvider.selectedAddress;
    let blockNumber;

    setInterval(() => {
        if (account !== web3.currentProvider.selectedAddress) {
            window.location.reload();
        }

        return web3.eth.getBlock('latest').then(block => {
            if (block && blockNumber !== block.number) {
                dispatch({
                    type: 'network/save',
                    payload: { block }
                });
                blockNumber = block.number;
            }
        });
    }, POLL_INTERVAL);
};

const getCelrAllowance = (account, contracts) => {
    const { ERC20ExampleToken, LiBA } = contracts;
    ERC20ExampleToken.methods.allowance.cacheCall(account, LiBA.address);
};
