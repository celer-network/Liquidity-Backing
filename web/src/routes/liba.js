import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Link } from 'dva/router';
import { Button, Card, List, Statistic, Row, Col, Icon } from 'antd';

import AuctionForm from '../components/liba/auction-form';
import { getUnitByAddress, formatCurrencyValue } from '../utils/unit';
import { getAuctionPeriod, getCurrentPeriod } from '../utils/liba';

const tabList = [
    {
        key: 'all',
        tab: 'All'
    },
    {
        key: 'own',
        tab: 'Own'
    },
    {
        key: 'bid',
        tab: 'Bid'
    }
];

class LiBA extends React.Component {
    constructor(props, context) {
        super(props);

        this.state = { isModalVisible: false, tab: 'all' };
        this.contracts = context.drizzle.contracts;
    }

    onTabChange = tab => {
        this.setState({ tab });
    };

    toggleModal = () => {
        this.setState(prevState => ({
            isModalVisible: !prevState.isModalVisible
        }));
    };

    renderAuction = auction => {
        const { network, LiBA } = this.props;
        const { asker, value, duration, tokenAddress } = auction.value;
        const unit = getUnitByAddress(network.supportedTokens, tokenAddress);

        return (
            <List.Item>
                <Card
                    actions={[
                        <Link to={`/auction/${auction.args[0]}`}>
                            <Icon type="eye" title="View Detail" />
                        </Link>
                    ]}
                >
                    <Row>
                        <Col span={12}>
                            <Statistic title="Asker" value={asker} />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="Period"
                                value={getCurrentPeriod(
                                    getAuctionPeriod(LiBA.getAuctionPeriod, auction),
                                    _.get(network, 'block.number')
                                )}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="Value"
                                value={formatCurrencyValue(value, unit)}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="Duration"
                                value={`${duration} Day`}
                            />
                        </Col>
                    </Row>
                </Card>
            </List.Item>
        );
    };

    renderAuctions = () => {
        const { accounts, LiBA } = this.props;
        const { tab } = this.state;

        let data = _.values(LiBA.getAuction);

        if (tab === 'own') {
            data = _.filter(
                data,
                auction => auction.value.asker === accounts[0]
            );
        }

        if (tab === 'bid') {
            data = _.filter(data, auction =>
                _.includes(LiBA.bids, auction.args[0])
            );
        }

        return (
            <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={data}
                renderItem={this.renderAuction}
            />
        );
    };

    render() {
        const { isModalVisible, tab } = this.state;
        const { network } = this.props;

        return (
            <Card
                tabList={tabList}
                title="Auctions"
                activeTabKey={tab}
                onTabChange={this.onTabChange}
                extra={
                    <Button type="primary" onClick={this.toggleModal}>
                        Launch auction
                    </Button>
                }
            >
                {this.renderAuctions()}
                <AuctionForm
                    network={network}
                    visible={isModalVisible}
                    onClose={this.toggleModal}
                />
            </Card>
        );
    }
}

LiBA.propTypes = {
    dispatch: PropTypes.func.isRequired
};

LiBA.contextTypes = {
    drizzle: PropTypes.object
};

function mapStateToProps(state) {
    const { contracts, accounts, LiBA, network } = state;

    return {
        accounts,
        network,
        LiBA: { ...LiBA, ...contracts.LiBA }
    };
}

export default drizzleConnect(LiBA, mapStateToProps);
