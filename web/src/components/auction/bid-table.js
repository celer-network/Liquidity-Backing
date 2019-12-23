import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Table } from 'antd';

import { RATE_BASE } from '../../utils/constant';
import {
    formatCurrencyValue,
    formatCelrValue,
    getUnitByAddress
} from '../../utils/unit';

const columns = [
    {
        title: 'Bidder',
        dataIndex: 'bidder'
    },
    {
        title: 'Rate',
        dataIndex: 'rate'
    },
    {
        title: 'Value',
        dataIndex: 'value'
    },
    {
        title: 'Celer value',
        dataIndex: 'celerValue'
    }
];

class BidTable extends React.Component {
    render() {
        const { auction, bids, network } = this.props;
        const unit = getUnitByAddress(
            network.supportedTokens,
            auction.value.tokenAddress
        );

        const dataSource = _.filter(bids).map(bid => {
            const bidder = bid.args[0];
            const { celerValue, rate, value } = bid.value;
            return {
                bidder,
                celerValue: formatCelrValue(celerValue),
                rate: rate / RATE_BASE,
                value: formatCurrencyValue(value, unit)
            };
        });

        return (
            <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
            />
        );
    }
}

BidTable.propTypes = {
    auction: PropTypes.object.isRequired,
    network: PropTypes.object.isRequired,
    LiBA: PropTypes.object.isRequired
};

function mapStateToProps(state) {}

export default drizzleConnect(BidTable, mapStateToProps);
