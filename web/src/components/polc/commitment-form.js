import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import { Modal } from 'antd';

import Form from '../form';
import {
    etherFieldOptions,
    dayFieldOptions,
    minValueRule
} from '../../utils/form';

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

            const { duration, value } = values;
            this.contracts.PoLC.methods.commitFund.cacheSend(duration, {
                value: web3.utils.toWei(value.toString(), 'ether')
            });
            this.form.current.resetFields();
            onClose();
        });
    };

    render() {
        const { visible, onClose } = this.props;
        const formItems = [
            {
                name: 'value',
                field: 'number',
                fieldOptions: etherFieldOptions,
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
