const POLL_INTERVAL = 1000;

export const subscribeEvent = (account, contracts) => {
    const { PoLC, LiBA } = contracts;

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
        }
    );
};

export const subscribeChainInfo = (web3, dispatch) => {
    let blockNumber;

    setInterval(() => {
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