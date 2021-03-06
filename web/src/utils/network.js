import { Modal } from 'antd';

// network
const MAINNET = '1';
const ROPSTEN = '3';

// token
export const CELR = 'CELR';
export const DAI = 'DAI';

const ethToken = {
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000'
};

const networkConfigs = {
    [ROPSTEN]: {
        supportedTokens: [
            // ethToken,
            {
                symbol: DAI,
                address: '0x6a3a9a07a0d687b73322d2F66FB42cC473162a0B'
            }
        ],
        minCELR: 500
    }
};

const localNetworkConfig = {
    supportedTokens: [
        ethToken,
        {
            symbol: CELR,
            address: '0x992E7b56FbF1082a71A49bA9c3FdeAE624545C1b'
        }
    ],
    minCELR: 500
};

export const getNetworkConfig = networkID => {
    if (networkConfigs[networkID]) {
        return networkConfigs[networkID];
    }

    return localNetworkConfig;
};

export const checkNetworkCompatbility = () => {
    if (process.env.NODE_ENV === 'development') {
        return;
    }

    const networkVersion = window.web3.currentProvider.networkVersion;
    if (networkVersion !== MAINNET && networkVersion !== ROPSTEN) {
        Modal.error({
            title: 'Current network is not supported',
            content: 'Please switch to mainnet or ropsten'
        });
    }
};
