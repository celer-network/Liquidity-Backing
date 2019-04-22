import React from 'react';
import PropTypes from 'prop-types';
import web3 from 'web3';
import _ from 'lodash';
import { drizzleConnect } from 'drizzle-react';
import { Modal } from 'antd';

import Form from '../form';
import { etherFieldOptions, minValueRule } from '../../utils/form';
import { formatEthValue } from '../../utils/unit';

class RevealForm extends React.Component {
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

            const { celerValue, value, rate, salt, commitmentID } = values;

            this.contracts.LiBA.methods.revealBid.cacheSend(
                auctionId,
                rate,
                web3.utils.toWei(value.toString(), 'ether'),
                celerValue,
                salt,
                parseInt(commitmentID)
            );
            onClose();
        });
    };

    render() {
        const { visible, PoLC, onClose } = this.props;
        const commitmentOptions = _.map(PoLC.commitmentsByUser, commitment => {
            const id = commitment.args[1];
            const availableValue = formatEthValue(
                commitment.value.availableValue
            );

            return [id, `ID: ${id}, Available Value: ${availableValue}`];
        });

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
                name: 'rate',
                field: 'number',
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
                rules: [
                    minValueRule(0),
                    {
                        message: 'Please enter a salt!',
                        required: true
                    }
                ]
            },
            {
                name: 'commitmentID',
                field: 'select',
                fieldOptions: {
                    options: commitmentOptions
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
    auctionId: PropTypes.string.isRequired,
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
