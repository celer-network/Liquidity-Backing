const networkConfigs = {};

const localNetworkConfig = {
    supportedTokens: [
        {
            symbol: 'ETH',
            address: '0x0000000000000000000000000000000000000000'
        }
    ]
};

export const getNetworkConfig = networkID => {
    if (networkConfigs[networkID]) {
        return networkConfigs[networkID];
    }

    return localNetworkConfig;
};
