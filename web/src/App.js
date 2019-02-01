import * as React from 'react';
import PropTypes from 'prop-types';
import { drizzleConnect } from 'drizzle-react';
import { withRouter, Link } from 'dva/router';
import { Card, Layout, Menu } from 'antd';
import { AccountData } from 'drizzle-react-components';

import './App.css';

const { Sider, Content, Footer } = Layout;

function App({ children, location, drizzleStatus }) {
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

App.propTypes = {
    children: PropTypes.element.isRequired,
    location: PropTypes.object.isRequired
};

function mapStateToProps (state) {
    const { drizzleStatus } = state;

    return {
        drizzleStatus
    };
}

export default withRouter(drizzleConnect(App, mapStateToProps));
