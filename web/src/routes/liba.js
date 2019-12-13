import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Link } from 'dva/router';
import { Button, Card, List, Statistic, Row, Col, Icon } from 'antd';

import Filter from '../components/filter';
import AuctionForm from '../components/liba/auction-form';
import { getUnitByAddress, formatCurrencyValue } from '../utils/unit';
import { getAuctionPeriod, getCurrentPeriod, ALL_PERIODS } from '../utils/liba';

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

        this.state = { isModalVisible: false, tab: 'all', filter: {} };
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

    updateFilter = change => {
        this.setState(prevState => ({
            filter: { ...prevState.filter, ...change }
        }));
    };

    renderAuction = auction => {
        const { network } = this.props;
        const { asker, value, duration, tokenAddress, period } = auction.value;
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
                            <Statistic title="Period" value={period} />
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

    renderFilters = () => {
        const periodOptions = ALL_PERIODS.map(period => [period, period]);
        const askerOptions = _(this.auctions)
            .map(auction => auction.value.asker)
            .uniq()
            .map(asker => [asker, asker])
            .value();

        return (
            <>
                <Filter
                    name="period"
                    options={periodOptions}
                    style={{ width: 100 }}
                    onChange={this.updateFilter}
                    allowClear
                />
                <Filter
                    name="asker"
                    options={askerOptions}
                    style={{ width: 200 }}
                    onChange={this.updateFilter}
                    allowClear
                />
            </>
        );
    };

    renderAuctions = () => {
        const { accounts, LiBA, network } = this.props;
        const { tab, filter } = this.state;

        let auctions = _.values(LiBA.getAuction);

        if (tab === 'own') {
            auctions = _.filter(
                auctions,
                auction => auction.value.asker === accounts[0]
            );
        }

        if (tab === 'bid') {
            auctions = _.filter(auctions, auction =>
                _.includes(LiBA.bids, auction.args[0])
            );
        }

        auctions = _.filter(auctions, auction => {
            const { asker } = auction.value;
            if (filter.asker && filter.asker !== asker) {
                return false;
            }

            const period = getCurrentPeriod(
                getAuctionPeriod(LiBA.getAuctionPeriod, auction),
                _.get(network, 'block.number')
            );

            if (filter.period && filter.period !== period) {
                return false;
            }

            auction.value.period = period;
            return true;
        });
        this.auctions = auctions;

        return (
            <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={auctions}
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
                {this.renderFilters()}
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
