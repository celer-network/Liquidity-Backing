import * as React from 'react';
import PropTypes from 'prop-types';
import { drizzleConnect } from 'drizzle-react';
import { withRouter, Link } from 'dva/router';
import { Card, Layout, Menu } from 'antd';
import { AccountData } from 'drizzle-react-components';

import './App.css';

const { Sider, Content, Footer } = Layout;

class App extends React.Component {
    constructor(props, context) {
        super(props);
        this.contracts = context.drizzle.contracts;
    }

    componentWillMount() {
        const { accounts, dispatch } = this.props;
        const { PoLC } = this.contracts;

        PoLC.events.NewCommitment(
            {
                fromBlock: 0,
                filter: {
                    user: accounts[0]
                }
            },
            (err, event) => {
                if (err) {
                    return;
                }

                dispatch({
                    type: 'PoLC/fetchCommitments',
                    payload: { ...event.returnValues, PoLC }
                });
            }
        );
    }

    render() {
        const { children, location } = this.props;
        const { pathname } = location;
        return (
            <Layout>
                <Sider>
                    <Card className="account-data" title="Account info">
                        <AccountData accountIndex={0} units={'ether'} />
                    </Card>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[pathname.slice(1)]}
                    >
                        <Menu.Item key="polc">
                            <Link to="/polc">PoLC</Link>
                        </Menu.Item>
                    </Menu>
                </Sider>
                <Layout>
                    <Content>{children}</Content>
                    <Footer style={{ textAlign: 'center' }}>
                        cEconomy ©2019 Created by Celer Network
                    </Footer>
                </Layout>
            </Layout>
        );
    }
}

App.propTypes = {
    children: PropTypes.element.isRequired,
    location: PropTypes.object.isRequired
};

App.contextTypes = {
    drizzle: PropTypes.object
};

function mapStateToProps(state) {
    const { accounts } = state;

    return {
        accounts
    };
}

export default withRouter(drizzleConnect(App, mapStateToProps));
