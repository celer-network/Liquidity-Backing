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
    const account = web3.currentProvider.selectedAddress;

    setInterval(() => {
        if (account !== web3.currentProvider.selectedAddress) {
            window.location.reload();
        }

        return web3.eth.getBlock('latest').then(block =>
            dispatch({
                type: 'LiBA/save',
                payload: { block }
            })
        );
    }, POLL_INTERVAL);
};
