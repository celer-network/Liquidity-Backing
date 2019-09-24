import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import { Modal } from 'antd';

import Form from '../form';
import {
    currencyFieldOptions,
    celerFieldOptions,
    rateFieldOptions,
    minValueRule
} from '../../utils/form';
import { getUnitByAddress } from '../../utils/unit';

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

            const { celerValue, value, rate, salt } = values;
            const adjustedRate = rate * 1000;

            this.contracts.LiBA.methods.placeBid.cacheSend(
                auction.args[0],
                web3.utils.soliditySha3(
                    adjustedRate,
                    web3.utils.toWei(value.toString(), 'ether'),
                    web3.utils.toWei(celerValue.toString(), 'ether'),
                    salt
                ),
                web3.utils.toWei(celerValue.toString(), 'ether')
            );
            onClose();
        });
    };

    render() {
        const { auction, network, visible, onClose } = this.props;
        const unit = getUnitByAddress(
            network.supportedTokens,
            auction.value.tokenAddress
        );
        const formItems = [
            {
                name: 'value',
                field: 'number',
                fieldOptions: {
                    ...currencyFieldOptions(unit),
                    placeholder: 'The amount of token to lend'
                },
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a value!',
                        required: true
                    }
                ]
            },
            {
                name: 'rate',
                field: 'number',
                fieldOptions: {
                    ...rateFieldOptions,
                    placeholder: 'The lending interest rate',
                    step: 0.001,
                    precision: 3
                },
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a rate!',
                        required: true
                    }
                ]
            },
            {
                name: 'celerValue',
                label: 'Celer Value',
                field: 'number',
                fieldOptions: {
                    ...celerFieldOptions,
                    placeholder: 'The amount of celer token for bidding'
                },
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a celer value!',
                        required: true
                    }
                ]
            },
            {
                name: 'salt',
                field: 'number',
                fieldOptions: {
                    placeholder: 'A random number used to hide your bid info'
                },
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a salt!',
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
