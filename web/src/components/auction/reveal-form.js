import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Modal } from 'antd';

import Form from '../form';
import {
    celerFieldOptions,
    currencyFieldOptions,
    rateFieldOptions,
    minValueRule
} from '../../utils/form';
import { getUnitByAddress, formatCurrencyValue } from '../../utils/unit';
import { RATE_PRECISION, RATE_BASE } from '../../utils/constant';

class RevealForm extends React.Component {
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

            const { celerValue, value, rate, passcode, commitmentID } = values;
            this.contracts.LiBA.methods.revealBid.cacheSend(
                auction.args[0],
                rate * RATE_BASE,
                web3.utils.toWei(value.toString(), 'ether'),
                web3.utils.toWei(celerValue.toString(), 'ether'),
                passcode,
                parseInt(commitmentID)
            );
            onClose();
        });
    };

    render() {
        const { auction, network, PoLC, visible, onClose } = this.props;
        const unit = getUnitByAddress(
            network.supportedTokens,
            auction.value.tokenAddress
        );
        const commitmentOptions = _(PoLC.commitmentsByUser)
            .filter(
                commitment =>
                    commitment.value.tokenAddress === auction.value.tokenAddress
            )
            .map(commitment => {
                const id = commitment.args[1];
                console.log(commitment);
                const availableValue = formatCurrencyValue(
                    commitment.value.availableValue,
                    unit
                );

                return [id, `ID: ${id}, Available Value: ${availableValue}`];
            })
            .value();
        const defaultValues = JSON.parse(
            localStorage.getItem(`auction${auction.args[0]}`) || '{}'
        );

        const formItems = [
            {
                name: 'value',
                field: 'number',
                initialValue: defaultValues.value,
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
                label: 'Daily Rate',
                field: 'number',
                initialValue: defaultValues.rate,
                fieldOptions: {
                    ...rateFieldOptions,
                    step: 0.1,
                    precision: RATE_PRECISION,
                    placeholder: 'The daily lending interest rate'
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
                initialValue: defaultValues.celerValue,
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
                name: 'passcode',
                field: 'number',
                initialValue: defaultValues.passcode,
                fieldOptions: {
                    placeholder: 'The random number entered for bidding'
                },
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a passcode!',
                        required: true
                    }
                ]
            },
            {
                name: 'commitmentID',
                field: 'select',
                fieldOptions: {
                    options: commitmentOptions,
                    placeholder: 'The commitment in PoLC used for lending'
                },
                rules: [
                    {
                        message: 'Please enter a commitmentID!',
                        required: true
                    }
                ]
            }
        ];

        return (
            <Modal
                title="Reveal Auction"
                visible={visible}
                onOk={this.onSubmit}
                onCancel={onClose}
            >
                <Form ref={this.form} items={formItems} />
            </Modal>
        );
    }
}

RevealForm.propTypes = {
    auction: PropTypes.object.isRequired,
    network: PropTypes.object.isRequired,
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

RevealForm.contextTypes = {
    drizzle: PropTypes.object
};

function mapStateToProps(state) {
    const { contracts } = state;

    return {
        PoLC: contracts.PoLC
    };
}

export default drizzleConnect(RevealForm, mapStateToProps);
