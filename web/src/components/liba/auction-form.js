import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import { Modal } from 'antd';

import Form from '../form';
import {
    currencyFieldOptions,
    minValueRule,
    blockFieldOptions
} from '../../utils/form';
import { getUnitByAddress } from '../../utils/unit';

class AuctionForm extends React.Component {
    constructor(props, context) {
        super(props);

        this.state = {};
        this.form = React.createRef();
        this.contracts = context.drizzle.contracts;
    }

    handleValueChange = changedValue => this.setState(changedValue);

    handleInitAuction = () => {
        const { onClose } = this.props;

        this.form.current.validateFields((err, values) => {
            if (err) {
                return;
            }

            const {
                token,
                bidDuration,
                revealDuration,
                claimDuration,
                challengeDuration,
                finalizeDuration,
                value,
                duration,
                maxRate,
                minValue,
                collateralAddress,
                collateralValue = 0
            } = values;

            this.contracts.LiBA.methods.initAuction.cacheSend(
                token,
                bidDuration,
                revealDuration,
                claimDuration,
                challengeDuration,
                finalizeDuration,
                web3.utils.toWei(value.toString(), 'ether'),
                duration,
                maxRate,
                web3.utils.toWei(minValue.toString(), 'ether'),
                collateralAddress,
                web3.utils.toWei(collateralValue.toString(), 'ether')
            );
            onClose();
        });
    };

    render() {
        const { visible, network, onClose } = this.props;
        const supportedTokenOptions = network.supportedTokens.map(
            supportedToken => [
                supportedToken.address,
                `${supportedToken.symbol} (${supportedToken.address})`
            ]
        );

        const formItems = [
            {
                name: 'token',
                field: 'select',
                fieldOptions: {
                    options: supportedTokenOptions
                },
                rules: [
                    {
                        message: 'Please select a token!',
                        required: true
                    }
                ]
            },
            {
                name: 'value',
                field: 'number',
                fieldOptions: currencyFieldOptions(
                    getUnitByAddress(network.supportedTokens, this.state.token)
                ),
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a value!',
                        required: true
                    }
                ]
            },
            {
                name: 'maxRate',
                label: 'Max Rate',
                field: 'number',
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a max rate!',
                        required: true
                    }
                ]
            },
            {
                name: 'minValue',
                label: 'Min Value',
                field: 'number',
                fieldOptions: currencyFieldOptions(
                    getUnitByAddress(network.supportedTokens, this.state.token)
                ),
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a min value!',
                        required: true
                    }
                ]
            },
            {
                name: 'duration',
                field: 'number',
                fieldOptions: blockFieldOptions,
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a duration!',
                        required: true
                    }
                ]
            },
            {
                name: 'collateralAddress',
                label: 'Collateral Address'
            },
            {
                name: 'collateralValue',
                label: 'Collateral Value',
                field: 'number',
                rules: [minValueRule(0)]
            },
            {
                name: 'bidDuration',
                label: 'Bid Duration',
                field: 'number',
                fieldOptions: blockFieldOptions,
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a duration!',
                        required: true
                    }
                ]
            },
            {
                name: 'revealDuration',
                label: 'Reveal Duration',
                field: 'number',
                fieldOptions: blockFieldOptions,
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a duration!',
                        required: true
                    }
                ]
            },
            {
                name: 'claimDuration',
                label: 'Claim Duration',
                field: 'number',
                fieldOptions: blockFieldOptions,
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a duration!',
                        required: true
                    }
                ]
            },
            {
                name: 'challengeDuration',
                label: 'Challenge Duration',
                field: 'number',
                fieldOptions: blockFieldOptions,
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a duration!',
                        required: true
                    }
                ]
            },
            {
                name: 'finalizeDuration',
                label: 'Finalize Duration',
                field: 'number',
                fieldOptions: blockFieldOptions,
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a duration!',
                        required: true
                    }
                ]
            }
        ];

        return (
            <Modal
                title="Launch Auction"
                visible={visible}
                onOk={this.handleInitAuction}
                onCancel={onClose}
            >
                <Form
                    ref={this.form}
                    items={formItems}
                    onValuesChange={this.handleValueChange}
                />
            </Modal>
        );
    }
}

AuctionForm.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

AuctionForm.contextTypes = {
    drizzle: PropTypes.object
};

export default AuctionForm;
