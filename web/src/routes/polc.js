import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Button, Card, List, Statistic, Row, Col, Icon, message } from 'antd';

import CommimentForm from '../components/polc/commitment-form';
import { getUnitByAddress, formatCurrencyValue } from '../utils/unit';

const DAY = 24 * 60 * 60 * 1000;

const formatDayTime = day => {
    const date = day !== '0' ? new Date(_.toNumber(day) * DAY) : new Date();
    return date.toLocaleDateString();
};

const checkLock = day => {
    return _.toNumber(day) < new Date() / DAY;
};

class PoLC extends React.Component {
    constructor(props, context) {
        super(props);

        this.state = { isModalVisible: false };
        this.contracts = context.drizzle.contracts;
    }

    toggleModal = () => {
        this.setState(prevState => ({
            isModalVisible: !prevState.isModalVisible
        }));
    };

    withdrawFund = e => {
        const { index } = e.currentTarget.dataset;
        const { PoLC } = this.props;
        const commitment = _.values(PoLC.commitmentsByUser)[index];

        const { lockEnd } = commitment.value;
        const [, commitmentId] = commitment.args;

        if (!checkLock(lockEnd)) {
            message.error('Cannot withdraw fund before expiration');
            return;
        }
        this.contracts.PoLC.methods.withdrawFund.cacheSend(commitmentId);
    };

    withdrawReward = e => {
        const { index } = e.currentTarget.dataset;
        const { PoLC } = this.props;
        const commitment = _.values(PoLC.commitmentsByUser)[index];
        const { lockEnd } = commitment.value;
        const [, commitmentId] = commitment.args;

        if (!checkLock(lockEnd)) {
            message.error('Cannot withdraw reward before expiration');
            return;
        }
        this.contracts.PoLC.methods.withdrawReward.cacheSend(commitmentId);
    };

    renderCommitment = (commitment, index) => {
        const { network } = this.props;
        const {
            tokenAddress,
            lockEnd,
            availableValue,
            lendingValue
        } = commitment.value;
        const commitmentId = commitment.args[1];
        const unit = getUnitByAddress(network.supportedTokens, tokenAddress);

        return (
            <List.Item>
                <Card
                    actions={[
                        <Button
                            data-index={index}
                            icon="export"
                            size="small"
                            title="Withdraw Fund"
                            type="link"
                            onClick={this.withdrawFund}
                        >
                            Withdraw
                        </Button>,
                        <Button
                            data-index={index}
                            icon="dollar"
                            size="small"
                            title="Withdraw Reward"
                            type="link"
                            onClick={this.withdrawReward}
                        >
                            Reward
                        </Button>
                    ]}
                >
                    <Row>
                        <Col span={12}>
                            <Statistic
                                title="ID"
                                groupSeparator=""
                                value={commitmentId}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="Lock End"
                                value={formatDayTime(lockEnd)}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="Available Value"
                                value={formatCurrencyValue(
                                    availableValue,
                                    unit
                                )}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="Lending Value"
                                value={formatCurrencyValue(lendingValue, unit)}
                            />
                        </Col>
                    </Row>
                </Card>
            </List.Item>
        );
    };

    renderCommiments = () => {
        const { PoLC } = this.props;
        const data = _.values(PoLC.commitmentsByUser);

        return (
            <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={data}
                renderItem={this.renderCommitment}
            />
        );
    };

    render() {
        const { isModalVisible } = this.state;
        const { network } = this.props;

        return (
            <Card
                title="PoLC"
                extra={
                    <Button type="primary" onClick={this.toggleModal}>
                        Commit fund
                    </Button>
                }
            >
                {this.renderCommiments()}
                <CommimentForm
                    network={network}
                    visible={isModalVisible}
                    onClose={this.toggleModal}
                />
            </Card>
        );
    }
}

PoLC.propTypes = {
    dispatch: PropTypes.func.isRequired
};

PoLC.contextTypes = {
    drizzle: PropTypes.object
};

function mapStateToProps(state) {
    const { contracts, network } = state;
    return {
        network,
        PoLC: contracts.PoLC
    };
}

export default drizzleConnect(PoLC, mapStateToProps);
