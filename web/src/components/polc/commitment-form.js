import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import { Alert, Modal } from 'antd';

import Form from '../form';
import { EMPTY_ADDRESS } from '../../utils/constant';
import { getUnitByAddress } from '../../utils/unit';
import {
    currencyFieldOptions,
    dayFieldOptions,
    minValueRule
} from '../../utils/form';

class CommimentForm extends React.Component {
    constructor(props, context) {
        super(props);

        this.state = {};
        this.form = React.createRef();
        this.contracts = context.drizzle.contracts;
    }

    handleValueChange = changedValue => this.setState(changedValue);

    handleCommitFund = () => {
        const { onClose } = this.props;

        this.form.current.validateFields((err, values) => {
            if (err) {
                return;
            }

            const { token, duration, value } = values;
            const formatedValue = web3.utils.toWei(value.toString(), 'ether');
            const sendArgs = [token, duration, formatedValue];
            if (token === EMPTY_ADDRESS) {
                sendArgs.push({ value: formatedValue });
            }

            this.contracts.PoLC.methods.commitFund.cacheSend(...sendArgs);
            this.form.current.resetFields();
            onClose();
        });
    };

    render() {
        const { network, visible, onClose } = this.props;
        const supportedTokenOptions = network.supportedTokens.map(
            supportedToken => [
                supportedToken.address,
                `${supportedToken.symbol} (${supportedToken.address})`
            ]
        );
        const unit = getUnitByAddress(
            network.supportedTokens,
            this.state.token
        );

        const formItems = [
            {
                name: 'token',
                field: 'select',
                fieldOptions: {
                    options: supportedTokenOptions,
                    placeholder: 'Token type to commit'
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
                fieldOptions: {
                    ...currencyFieldOptions(unit),
                    placeholder: 'The amount of token to commit'
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
                name: 'duration',
                field: 'number',
                fieldOptions: {
                    ...dayFieldOptions,
                    placeholder: 'Lock-in duration'
                },
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
                title="Commit Fund"
                visible={visible}
                onOk={this.handleCommitFund}
                onCancel={onClose}
            >
                <Alert
                    message="Your fund will not be available until the commitment expires"
                    type="warning"
                    showIcon
                />
                <Form
                    ref={this.form}
                    items={formItems}
                    onValuesChange={this.handleValueChange}
                />
            </Modal>
        );
    }
}

CommimentForm.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

CommimentForm.contextTypes = {
    drizzle: PropTypes.object
};

export default CommimentForm;
