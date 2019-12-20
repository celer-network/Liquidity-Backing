import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Modal } from 'antd';

import Form from './form';
import { currencyFieldOptions } from '../utils/form';
import { CELR, DAI } from '../utils/network';

class ApproveCelrForm extends React.Component {
    constructor(props, context) {
        super(props);

        this.state = {};
        this.form = React.createRef();
        this.contracts = context.drizzle.contracts;
    }

    handleValueChange = changedValue => this.setState(changedValue);

    onSubmit = () => {
        const { onClose } = this.props;

        this.form.current.validateFields((err, values) => {
            if (err) {
                return;
            }

            const { token, contract, value } = values;
            const tokenInstance = this.getTokenInstance(token);
            if (!tokenInstance) {
                console.error('invalid token type');
                return;
            }

            tokenInstance.methods
                .approve(contract, web3.utils.toWei(value.toString(), 'ether'))
                .send();

            onClose();
        });
    };

    getTokenInstance = token => {
        switch (token) {
            case CELR:
                return this.contracts.CELRToken;
            case DAI:
                return this.contracts.DAIToken;
        }
    };

    render() {
        const { visible, onClose } = this.props;
        const { CELRToken, DAIToken, PoLC, LiBA } = this.contracts;
        const tokenOptions = [
            [CELR, `CELR (${_.get(CELRToken, 'address')})`],
            [DAI, `DAI (${_.get(DAIToken, 'address')})`]
        ];
        const contractOptions = [
            [_.get(PoLC, 'address'), `PoLC (${_.get(PoLC, 'address')})`],
            [_.get(LiBA, 'address'), `LiBA (${_.get(LiBA, 'address')})`]
        ];
        const formItems = [
            {
                name: 'token',
                field: 'select',
                fieldOptions: {
                    options: tokenOptions,
                    placeholder: 'The token for approve'
                },
                rules: [
                    {
                        message: 'Please select a token!',
                        required: true
                    }
                ]
            },
            {
                name: 'contract',
                field: 'select',
                fieldOptions: {
                    options: contractOptions,
                    placeholder: 'The contract to be approved'
                },
                rules: [
                    {
                        message: 'Please select a contract!',
                        required: true
                    }
                ]
            },
            {
                name: 'value',
                field: 'number',
                fieldOptions: {
                    ...currencyFieldOptions(this.state.token),
                    placeholder: 'The amount of token allowance'
                },
                rules: [
                    {
                        message: 'Please enter a value!',
                        required: true
                    }
                ]
            }
        ];

        return (
            <Modal
                title="Approve Token"
                visible={visible}
                onOk={this.onSubmit}
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

ApproveCelrForm.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

ApproveCelrForm.contextTypes = {
    drizzle: PropTypes.object
};

function mapStateToProps(state) {
    const { network } = state;

    return {
        network
    };
}

export default drizzleConnect(ApproveCelrForm, mapStateToProps);
