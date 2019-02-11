import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import { Modal } from 'antd';

import Form from '../form';

class ClaimForm extends React.Component {
    constructor(props, context) {
        super(props);

        this.form = React.createRef();
        this.contracts = context.drizzle.contracts;
    }

    onSubmit = () => {
        const { auctionId, onClose } = this.props;

        this.form.current.validateFields((err, values) => {
            if (err) {
                return;
            }

            const { winners } = values;
            this.contracts.LiBA.methods.claimWinners.cacheSend(
                auctionId,
                winners.split(',')
            );
            onClose();
        });
    };

    render() {
        const { visible, onClose } = this.props;
        const formItems = [
            {
                name: 'winners',
                field: 'text',
                fieldOptions: {
                    placeholder:
                        'Please enter winner addresses seperated by comma'
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
                title="Claim Auction"
                visible={visible}
                onOk={this.onSubmit}
                onCancel={onClose}
            >
                <Form ref={this.form} items={formItems} />
            </Modal>
        );
    }
}

ClaimForm.propTypes = {
    auctionId: PropTypes.string.isRequired,
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

ClaimForm.contextTypes = {
    drizzle: PropTypes.object
};

export default ClaimForm;
