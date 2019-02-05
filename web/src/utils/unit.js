import _ from 'lodash';
import web3 from 'web3';

export const formatEthValue = value => {
    const num = _.toNumber(value);

    if (num < 100000) {
        return `${value} wei`;
    }

    return `${web3.utils.fromWei(value)} ether`;
};
