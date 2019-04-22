import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Button, Card, List, Statistic, Row, Col, Icon, message } from 'antd';

import CommimentForm from '../components/polc/commitment-form';
import { formatEthValue } from '../utils/unit';

const DAY = 24 * 60 * 60 * 1000;

const formatDayTime = day => {
    return new Date(_.toNumber(day) * DAY).toLocaleDateString();
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
        const { index } = e.target.parentNode.dataset;
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
        const { index } = e.target.parentNode.dataset;
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
        const {
            lockStart,
            lockEnd,
            availableValue,
            lendingValue
        } = commitment.value;

        return (
            <List.Item>
                <Card
                    actions={[
                        <Icon
                            type="export"
                            title="Withdraw Fund"
                            data-index={index}
                            onClick={this.withdrawFund}
                        />,
                        <Icon
                            type="dollar"
                            title="Withdraw Reward"
                            data-index={index}
                            onClick={this.withdrawReward}
                        />
                    ]}
                >
                    <Row>
                        <Col span={12}>
                            <Statistic
                                title="Lock Start"
                                value={formatDayTime(lockStart)}
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
                                value={formatEthValue(availableValue)}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="Locked Value"
                                value={formatEthValue(lendingValue)}
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
    const { contracts } = state;

    return {
        PoLC: contracts.PoLC
    };
}

export default drizzleConnect(PoLC, mapStateToProps);
