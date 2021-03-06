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
    Divider,
    Result,
    notification
} from 'antd';

import BidTable from '../components/auction/bid-table';
import BidForm from '../components/auction/bid-form';
import RevealForm from '../components/auction/reveal-form';
import { formatCurrencyValue, getUnitByAddress } from '../utils/unit';
import {
    getAuctionPeriod,
    getCurrentPeriod,
    getWinners,
    calculateRepay,
    BID,
    REVEAL,
    CLAIM,
    CHALLENGE,
    FINALIZE,
    EXPIRED,
    FINALIZED
} from '../utils/liba';
import { EMPTY_ADDRESS, RATE_BASE } from '../utils/constant';
import { blockFieldOptions } from '../utils/form';

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

        const auctionId = props.match.params.id;
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

        const auctionPeriod = getAuctionPeriod(LiBA.getAuctionPeriod, auction);
        const blockNumber = _.get(network, 'block.number');
        const currentPeriod = getCurrentPeriod(auctionPeriod, blockNumber);
        const currentStep = _.indexOf(steps, currentPeriod);
        const auctionId = auction.args[0];
        const bids = _.filter(
            LiBA.bidsByUser,
            bid => bid.args[1] === auctionId
        );

        return {
            auction,
            auctionId,
            bids,
            auctionPeriod,
            blockNumber,
            currentPeriod,
            currentStep
        };
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
            default:
                console.error('invalid period');
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
        const { auctionId } = this.state;
        const { winners, topLoser } = this.getWinners();

        this.contracts.LiBA.methods
            .claimWinners(auctionId, winners, topLoser)
            .send();
    };

    challengeWinners = () => {
        const { auctionId, winners } = this.state;
        const { winners: calculatedWinners, topLoser } = this.getWinners();

        if (_.isEqual(winners, calculatedWinners)) {
            notification.error({
                message: 'There is no need to challenge winners'
            });
            return;
        }

        const challenger = _.difference(calculatedWinners, winners)[0];

        this.contracts.LiBA.methods
            .challengeWinners(
                auctionId,
                challenger,
                calculatedWinners,
                topLoser
            )
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
        const { auctionId, auction, bids, winners } = this.state;
        const { tokenAddress } = auction.value;
        const sendArgs = [auctionId];
        if (tokenAddress === EMPTY_ADDRESS) {
            sendArgs.push({
                value: calculateRepay(bids, winners).toString()
            });
        }

        this.contracts.LiBA.methods.repayAuction.cacheSend(...sendArgs);
    };

    getWinners = () => {
        const { auction, bids } = this.state;
        return getWinners(auction, bids);
    };

    renderAction = () => {
        const { accounts } = this.props;
        const { auction, currentPeriod, currentStep, winners } = this.state;
        const { asker, collateralValue } = auction.value;
        const currentAccount = accounts[0];

        if (currentAccount === asker) {
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

            if (currentPeriod === FINALIZED && collateralValue > 0) {
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
        const { network } = this.props;
        const { auction, bids, winners } = this.state;
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
        const unit = getUnitByAddress(network.supportedTokens, tokenAddress);
        const defaultValues = JSON.parse(
            localStorage.getItem(
                `auction-${this.contracts.LiBA.address}-${auction.args[0]}`
            ) || '{}'
        );
        let ownBidResult;

        if (_.isEmpty(defaultValues)) {
            ownBidResult = (
                <Result status="warning" title="You have not placed bid yet" />
            );
        } else {
            ownBidResult = (
                <Row>
                    <Col span={12}>
                        <Statistic
                            title="Value"
                            value={`${defaultValues.value}  ${unit}`}
                        />
                    </Col>
                    <Col span={12}>
                        <Statistic
                            title="Daily Rate"
                            value={`${defaultValues.rate} %`}
                        />
                    </Col>{' '}
                    <Col span={12}>
                        <Statistic
                            title="Celer Value"
                            value={`${defaultValues.celerValue} CELR`}
                        />
                    </Col>{' '}
                    <Col span={12}>
                        <Statistic
                            title="Passcode"
                            value={defaultValues.passcode}
                        />
                    </Col>
                </Row>
            );
        }

        return (
            <Row style={{ marginTop: '10px' }}>
                <Col span={24}>
                    <Statistic title="Asker" value={asker} />
                </Col>
                <Col span={24}>
                    <Statistic title="Token Address" value={tokenAddress} />
                </Col>
                <Col span={12}>
                    <Statistic
                        title="Value"
                        value={formatCurrencyValue(value, unit)}
                    />
                </Col>
                <Col span={12}>
                    <Statistic title="Duration" value={`${duration} Day`} />
                </Col>
                <Col span={12}>
                    <Statistic
                        title="Min Value"
                        value={formatCurrencyValue(minValue, unit)}
                    />
                </Col>
                <Col span={12}>
                    <Statistic
                        title="Max Daily Rate"
                        value={`${maxRate / RATE_BASE} %`}
                    />
                </Col>
                {collateralValue > 0 && (
                    <>
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
                        <Tabs.TabPane tab="Your Bid" key="own">
                            {ownBidResult}
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Bids" key="bids">
                            <BidTable
                                auction={auction}
                                bids={bids}
                                network={network}
                            />
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

    renderProgress = () => {
        const {
            auctionPeriod,
            blockNumber,
            currentPeriod,
            currentStep
        } = this.state;

        if (currentStep === -1) {
            return <Alert type="warning" message={currentPeriod} showIcon />;
        }

        const action = currentPeriod.toLowerCase();
        const blockLeft = auctionPeriod.value[action + 'End'] - blockNumber;

        return (
            <>
                <Steps size="small" current={currentStep}>
                    {_.map(steps, step => (
                        <Step key={step} title={step} />
                    ))}
                </Steps>

                <Divider>
                    {blockFieldOptions.formatter(blockLeft)} left to {action}
                </Divider>
            </>
        );
    };

    render() {
        const { network } = this.props;
        const { auction, isBidModalVisible, isRevealModalVisible } = this.state;

        if (!auction) {
            return <Skeleton />;
        }

        return (
            <Card title="Auction" actions={this.renderAction()}>
                {this.renderProgress()}
                {this.renderAuctionDetail()}
                <BidForm
                    auction={auction}
                    network={network}
                    visible={isBidModalVisible}
                    onClose={this.toggleBidModal}
                />
                <RevealForm
                    auction={auction}
                    network={network}
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
