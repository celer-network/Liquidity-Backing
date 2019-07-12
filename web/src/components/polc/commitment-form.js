import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import { Modal } from 'antd';

import Form from '../form';
import { EMPTY_ADDRESS } from '../../utils/constant';
import { dayFieldOptions, minValueRule } from '../../utils/form';

class CommimentForm extends React.Component {
    constructor(props, context) {
        super(props);

        this.form = React.createRef();
        this.contracts = context.drizzle.contracts;
    }

    handleCommitFund = () => {
        const { onClose } = this.props;

        this.form.current.validateFields((err, values) => {
            if (err) {
                return;
            }

            const { token, duration, value } = values;
            const formatedValue = web3.utils.toWei(value.toString(), 'ether');
            const sendOption = {};
            if (token === EMPTY_ADDRESS) {
                sendOption.value = formatedValue;
            }

            this.contracts.PoLC.methods.commitFund.cacheSend(
                token,
                duration,
                formatedValue,
                sendOption
            );
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
                fieldOptions: dayFieldOptions,
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
                <Form ref={this.form} items={formItems} />
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
