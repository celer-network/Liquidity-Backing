import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Button, Card, Steps, Skeleton, Statistic, Row, Col } from 'antd';

import BidForm from '../components/auction/bid-form';
import RevealForm from '../components/auction/reveal-form';
import ClaimForm from '../components/auction/claim-form';
import ChallengeForm from '../components/auction/challenge-form';
import { formatEthValue } from '../utils/unit';
import {
    getCurrentPeriod,
    BID,
    REVEAL,
    CLAIM,
    CHALLENGE,
    FINALIZE
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
            isRevealModalVisible: false,
            isClaimModalVisible: false,
            isChallengeModalVisible: false
        };
    }

    static getDerivedStateFromProps(props) {
        const { match, LiBA = {} } = props;

        const auctions = _.values(LiBA.getAuction);
        const auction = _.find(
            auctions,
            auction => auction.args[0] === match.params.id
        );

        if (!auction) {
            return;
        }

        const currentBlockNumber = LiBA.block.number;
        const currentPeriod = getCurrentPeriod(currentBlockNumber, auction);
        const currentStep = _.indexOf(steps, currentPeriod);

        return { auction, currentStep, currentPeriod };
    }

    takeAction = () => {
        const { currentPeriod } = this.state;

        switch (currentPeriod) {
            case BID:
                return this.toggleBidModal();
            case REVEAL:
                return this.toggleRevealModal();
            case CLAIM:
                return this.toggleClaimModal();
            case CHALLENGE:
                return this.toggleChallengeModal();
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

    toggleClaimModal = () => {
        this.setState(prevState => ({
            isClaimModalVisible: !prevState.isClaimModalVisible
        }));
    };

    toggleChallengeModal = () => {
        this.setState(prevState => ({
            isChallengeModalVisible: !prevState.isChallengeModalVisible
        }));
    };

    finalizeAuction = () => {
        const { auction } = this.state;
        this.contracts.LiBA.methods.claimWinners.cacheSend(auction.args[0]);
    };

    renderAction = () => {
        const { accounts } = this.props;
        const { auction, currentPeriod } = this.state;

        if (currentPeriod === CLAIM) {
            if (auction.value.asker !== accounts[0]) {
                return [];
            }
        } else {
            if (
                currentPeriod !== FINALIZE &&
                auction.value.asker === accounts[0]
            ) {
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
        const { auction } = this.state;
        const { asker, value, duration, maxRate, minValue } = auction.value;

        return (
            <Row>
                <Col span={24}>
                    <Statistic title="Asker" value={asker} />
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
            </Row>
        );
    };

    render() {
        const {
            auction,
            currentStep,
            isBidModalVisible,
            isRevealModalVisible,
            isClaimModalVisible,
            isChallengeModalVisible
        } = this.state;

        if (!auction) {
            return <Skeleton />;
        }

        const auctionId = auction.args[0];

        return (
            <Card title="Auction" actions={this.renderAction()}>
                <Steps size="small" current={currentStep}>
                    {_.map(steps, step => (
                        <Step key={step} title={step} />
                    ))}
                </Steps>
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
                <ClaimForm
                    auctionId={auctionId}
                    visible={isClaimModalVisible}
                    onClose={this.toggleClaimModal}
                />
                <ChallengeForm
                    auctionId={auctionId}
                    visible={isChallengeModalVisible}
                    onClose={this.toggleChallengeModal}
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
    const { accounts, contracts, LiBA } = state;

    return {
        accounts,
        LiBA: { ...LiBA, ...contracts.LiBA }
    };
}

export default drizzleConnect(Auction, mapStateToProps);
