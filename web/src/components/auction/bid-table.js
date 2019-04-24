import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Table } from 'antd';

import { formatEthValue } from '../../utils/unit';

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
        const { auctionId, LiBA } = this.props;
        const dataSource = _.filter(
            LiBA.bidsByUser,
            bid => bid.args[1] === auctionId
        ).map(bid => {
            const bidder = bid.args[0];

            return {
                ...bid.value,
                bidder,
                value: formatEthValue(bid.value.value)
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
    auctionId: PropTypes.string.isRequired,
    LiBA: PropTypes.object.isRequired
};

function mapStateToProps(state) {
    const { contracts } = state;

    return {
        LiBA: contracts.LiBA
    };
}

export default drizzleConnect(BidTable, mapStateToProps);
