import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import { Modal } from 'antd';

import Form from '../form';
import { etherFieldOptions, dayFieldOptions } from '../../utils/form';

class AuctionForm extends React.Component {
    constructor(props, context) {
        super(props);

        this.form = React.createRef();
        this.contracts = context.drizzle.contracts;
    }

    handleInitAuction = () => {
        const { onClose } = this.props;

        this.form.current.validateFields((err, values) => {
            if (err) {
                return;
            }

            const {
                bidDuration,
                revealDuration,
                claimDuration,
                challengeDuration,
                finalizeDuration,
                value,
                duration,
                maxRate,
                minValue
            } = values;

            this.contracts.LiBA.methods.initAuction.cacheSend(
                bidDuration,
                revealDuration,
                claimDuration,
                challengeDuration,
                finalizeDuration,
                web3.utils.toWei(value.toString(), 'ether'),
                duration,
                maxRate,
                minValue
            );
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
                    {
                        message: 'Please enter a duration!',
                        required: true
                    }
                ]
            },
            {
                name: 'bidDuration',
                label: 'Bid Duration',
                field: 'number',
                rules: [
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
                rules: [
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
                rules: [
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
                rules: [
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
                rules: [
                    {
                        message: 'Please enter a duration!',
                        required: true
                    }
                ]
            },
            {
                name: 'maxRate',
                label: 'Max Rate',
                field: 'number',
                rules: [
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
                rules: [
                    {
                        message: 'Please enter a min value!',
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
                <Form ref={this.form} items={formItems} />
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
