import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import { Modal, Alert } from 'antd';

import Form from '../form';
import {
    currencyFieldOptions,
    celerFieldOptions,
    rateFieldOptions,
    minValueRule,
    maxValueRule
} from '../../utils/form';
import { getUnitByAddress, formatCurrencyValue } from '../../utils/unit';
import { RATE_PRECISION, RATE_BASE } from '../../utils/constant';

class BidForm extends React.Component {
    constructor(props, context) {
        super(props);

        this.form = React.createRef();
        this.contracts = context.drizzle.contracts;
    }

    onSubmit = () => {
        const { auction, onClose } = this.props;

        this.form.current.validateFields((err, values) => {
            if (err) {
                return;
            }

            const { celerValue, value, rate, passcode } = values;
            const auctionId = auction.args[0];

            this.contracts.LiBA.methods.placeBid.cacheSend(
                auction.args[0],
                web3.utils.soliditySha3(
                    rate * RATE_BASE,
                    web3.utils.toWei(value.toString(), 'ether'),
                    web3.utils.toWei(celerValue.toString(), 'ether'),
                    passcode
                ),
                web3.utils.toWei(celerValue.toString(), 'ether')
            );

            localStorage.setItem(`auction${auctionId}`, JSON.stringify(values));
            onClose();
        });
    };

    render() {
        const { auction, network, visible, onClose } = this.props;
        const { tokenAddress, maxRate, minValue } = auction.value;
        const unit = getUnitByAddress(network.supportedTokens, tokenAddress);
        const formItems = [
            {
                name: 'value',
                field: 'number',
                fieldOptions: {
                    ...currencyFieldOptions(unit),
                    placeholder: 'The amount of token to lend'
                },
                rules: [
                    minValueRule(formatCurrencyValue(minValue)),
                    {
                        message: 'Please enter a value!',
                        required: true
                    }
                ]
            },
            {
                name: 'rate',
                label: 'Daily Rate',
                field: 'number',
                fieldOptions: {
                    ...rateFieldOptions,
                    placeholder: 'The daily lending interest rate',
                    step: 0.1,
                    precision: RATE_PRECISION
                },
                rules: [
                    minValueRule(0),
                    maxValueRule(maxRate / RATE_BASE),
                    {
                        message: 'Please enter a rate!',
                        required: true
                    }
                ]
            },
            {
                name: 'celerValue',
                label: 'CELR Value',
                field: 'number',
                fieldOptions: {
                    ...celerFieldOptions,
                    placeholder: 'The amount of celer token for bidding'
                },
                rules: [
                    minValueRule(network.minCELR),
                    {
                        message: 'Please enter a celer value!',
                        required: true
                    }
                ]
            },
            {
                name: 'passcode',
                field: 'number',
                fieldOptions: {
                    placeholder: 'A random number used to hide your bid info'
                },
                rules: [
                    minValueRule(10000),
                    {
                        message: 'Please enter a passcode!',
                        required: true
                    }
                ]
            }
        ];

        return (
            <Modal
                title="Bid Auction"
                visible={visible}
                onOk={this.onSubmit}
                onCancel={onClose}
            >
                <Alert
                    type="warning"
                    message="Once the bid is placed, you have to reveal it, or you will lose staked CELR"
                    showIcon
                />
                <Form ref={this.form} items={formItems} />
            </Modal>
        );
    }
}

BidForm.propTypes = {
    auction: PropTypes.object.isRequired,
    network: PropTypes.object.isRequired,
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

BidForm.contextTypes = {
    drizzle: PropTypes.object
};

export default BidForm;
