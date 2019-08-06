import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import {
    Alert,
    Button,
    Card,
    Steps,
    Skeleton,
    Statistic,
    Tabs,
    List,
    Row,
    Col,
    notification
} from 'antd';

import BidTable from '../components/auction/bid-table';
import BidForm from '../components/auction/bid-form';
import RevealForm from '../components/auction/reveal-form';
import { formatEthValue } from '../utils/unit';
import {
    getCurrentPeriod,
    getWinners,
    BID,
    REVEAL,
    CLAIM,
    CHALLENGE,
    FINALIZE,
    EXPIRED,
    FINALIZED
} from '../utils/liba';

const { Step } = Steps;

const steps = [BID, REVEAL, CLAIM, CHALLENGE, FINALIZE];

class Auction extends React.Component {
    constructor(props, context) {
        super(props);

        this.contracts = context.drizzle.contracts;
        this.state = {
            auction: null,
            currentStep: 0,
            currentPeriod: '',
            isBidModalVisible: false,
            isRevealModalVisible: false
        };

        const auctionId = parseInt(props.match.params.id);

        this.contracts.LiBA.events.RevealBid(
            {
                fromBlock: 0,
                filter: { auctionId }
            },
            (err, event) => {
                if (err) {
                    return;
                }

                const { auctionId, bidder } = event.returnValues;
                this.contracts.LiBA.methods.bidsByUser.cacheCall(
                    bidder,
                    auctionId
                );
            }
        );

        this.contracts.LiBA.events.ClaimWinners(
            {
                fromBlock: 0,
                filter: { auctionId }
            },
            (err, event) => {
                if (err) {
                    return;
                }

                const { winners } = event.returnValues;
                this.setState({
                    winners
                });
            }
        );
    }

    static getDerivedStateFromProps(props) {
        const { match, LiBA = {}, network } = props;

        const auctions = _.values(LiBA.getAuction);
        const auction = _.find(
            auctions,
            auction => auction.args[0] === match.params.id
        );

        if (!auction) {
            return {};
        }

        const currentPeriod = getCurrentPeriod(
            network,
            auction,
            LiBA.getAuctionPeriod
        );
        const currentStep = _.indexOf(steps, currentPeriod);
        const auctionId = auction.args[0];

        return { auction, auctionId, currentStep, currentPeriod };
    }

    takeAction = () => {
        const { currentPeriod } = this.state;

        switch (currentPeriod) {
            case BID:
                return this.toggleBidModal();
            case REVEAL:
                return this.toggleRevealModal();
            case CLAIM:
                return this.claimWinners();
            case CHALLENGE:
                return this.challengeWinners();
            case FINALIZE:
                return this.finalizeAuction();
        }
    };

    toggleBidModal = () => {
        this.setState(prevState => ({
            isBidModalVisible: !prevState.isBidModalVisible
        }));
    };

    toggleRevealModal = () => {
        this.setState(prevState => ({
            isRevealModalVisible: !prevState.isRevealModalVisible
        }));
    };

    claimWinners = () => {
        const { auction, auctionId } = this.state;
        const { LiBA } = this.props;
        const winners = getWinners(auction, _.values(LiBA.bidsByUser));

        this.contracts.LiBA.methods.claimWinners(auctionId, winners).send();
    };

    challengeWinners = () => {
        const { auction, auctionId, winners } = this.state;
        const { LiBA } = this.props;
        const calculatedWinners = getWinners(
            auction,
            _.values(LiBA.bidsByUser)
        );

        if (_.isEqual(winners, calculatedWinners)) {
            notification.error({
                message: 'There is no need to challenge winners'
            });
            return;
        }

        this.contracts.LiBA.methods
            .challengeWinners(auctionId, calculatedWinners)
            .send();
    };

    finalizeAuction = () => {
        const { auctionId } = this.state;
        this.contracts.LiBA.methods.finalizeAuction.cacheSend(auctionId);
    };

    finalizeBid = () => {
        const { auctionId } = this.state;
        this.contracts.LiBA.methods.finalizeBid.cacheSend(auctionId);
    };

    collectCollateral = () => {
        const { auctionId } = this.state;
        this.contracts.LiBA.methods.collectCollateral.cacheSend(auctionId);
    };

    repayAuction = () => {
        const { auctionId } = this.state;
        this.contracts.LiBA.methods.repayAuction.cacheSend(auctionId);
    };

    renderAction = () => {
        const { accounts } = this.props;
        const { auction, currentPeriod, currentStep, winners } = this.state;
        const currentAccount = accounts[0];
        const isAsker = currentAccount === auction.value.asker;

        if (isAsker) {
            if (currentPeriod === FINALIZED) {
                return [
                    <Button block type="primary" onClick={this.repayAuction}>
                        Repay
                    </Button>
                ];
            }

            if (!_.includes([CLAIM, FINALIZE], currentPeriod)) {
                return [];
            }
        } else {
            if (
                currentPeriod === EXPIRED ||
                (currentStep === -1 && !_.includes(winners, currentAccount))
            ) {
                return [
                    <Button block type="primary" onClick={this.finalizeBid}>
                        Withdraw bid
                    </Button>
                ];
            }

            if (currentPeriod === FINALIZED) {
                return [
                    <Button
                        block
                        type="primary"
                        onClick={this.collectCollateral}
                    >
                        Collect collateral
                    </Button>
                ];
            }

            if (!_.includes([BID, REVEAL, CHALLENGE], currentPeriod)) {
                return [];
            }
        }

        return [
            <Button block type="primary" onClick={this.takeAction}>
                {currentPeriod}
            </Button>
        ];
    };

    renderAuctionDetail = () => {
        const { auction, winners } = this.state;
        const {
            asker,
            tokenAddress,
            collateralAddress,
            collateralValue,
            value,
            duration,
            maxRate,
            minValue
        } = auction.value;
        const auctionId = auction.args[0];

        return (
            <Row style={{ marginTop: '10px' }}>
                <Col span={24}>
                    <Statistic title="Asker" value={asker} />
                </Col>
                <Col span={24}>
                    <Statistic title="Token Address" value={tokenAddress} />
                </Col>
                <Col span={12}>
                    <Statistic title="Value" value={formatEthValue(value)} />
                </Col>
                <Col span={12}>
                    <Statistic title="Duration" value={duration} />
                </Col>
                <Col span={12}>
                    <Statistic
                        title="Min Value"
                        value={formatEthValue(minValue)}
                    />
                </Col>
                <Col span={12}>
                    <Statistic title="Max Rate" value={maxRate} />
                </Col>
                {collateralValue > 0 && (
                    <>
                        (
                        <Col span={12}>
                            <Statistic
                                title="Collateral Address"
                                value={collateralAddress}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="Collateral Value"
                                value={collateralValue}
                            />
                        </Col>
                    </>
                )}

                <Col span={24}>
                    <Tabs>
                        <Tabs.TabPane tab="Bids" key="bids">
                            <BidTable auctionId={auctionId} />
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Winners" key="winners">
                            <List
                                size="small"
                                bordered
                                dataSource={winners}
                                renderItem={winner => (
                                    <List.Item>{winner}</List.Item>
                                )}
                            />
                        </Tabs.TabPane>
                    </Tabs>
                </Col>
            </Row>
        );
    };

    render() {
        const {
            auction,
            currentStep,
            currentPeriod,
            isBidModalVisible,
            isRevealModalVisible
        } = this.state;

        if (!auction) {
            return <Skeleton />;
        }

        const auctionId = auction.args[0];
        let alertMsg;

        if (currentStep === -1)
            alertMsg = <Alert message={currentPeriod} type="info" showIcon />;

        return (
            <Card title="Auction" actions={this.renderAction()}>
                {alertMsg || (
                    <Steps size="small" current={currentStep}>
                        {_.map(steps, step => (
                            <Step key={step} title={step} />
                        ))}
                    </Steps>
                )}

                {this.renderAuctionDetail()}
                <BidForm
                    auctionId={auctionId}
                    visible={isBidModalVisible}
                    onClose={this.toggleBidModal}
                />
                <RevealForm
                    auctionId={auctionId}
                    visible={isRevealModalVisible}
                    onClose={this.toggleRevealModal}
                />
            </Card>
        );
    }
}

Auction.propTypes = {
    dispatch: PropTypes.func.isRequired
};

Auction.contextTypes = {
    drizzle: PropTypes.object
};

function mapStateToProps(state) {
    const { accounts, contracts, LiBA, network } = state;

    return {
        accounts,
        network,
        LiBA: { ...LiBA, ...contracts.LiBA }
    };
}

export default drizzleConnect(Auction, mapStateToProps);
