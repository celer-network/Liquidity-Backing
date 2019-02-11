import React from 'react';
import PropTypes from 'prop-types';
import { withRouter, routerRedux, Switch, Route, Redirect } from 'dva/router';
import Dynamic from 'dva/dynamic';
import { DrizzleProvider } from 'drizzle-react';
import { LoadingContainer } from 'drizzle-react-components';
import { Spin } from 'antd';

import App from './App';
import contractOptions from './utils/contracts';

const { ConnectedRouter } = routerRedux;
const LoadingWrapper = withRouter(LoadingContainer);

const redirectToHome = () => <Redirect to="/polc" />;

function RouterConfig({ history, app }) {
    const PoLC = Dynamic({
        app,
        component: () => import('./routes/polc')
    });
    const LiBA = Dynamic({
        app,
        component: () => import('./routes/liba')
    });
    const Auction = Dynamic({
        app,
        component: () => import('./routes/auction')
    });

    return (
        <DrizzleProvider options={contractOptions} store={app._store}>
            <ConnectedRouter history={history}>
                <LoadingWrapper loadingComp={Spin}>
                    <App>
                        <Switch>
                            <Route exact path="/polc" component={PoLC} />
                            <Route exact path="/liba" component={LiBA} />
                            <Route
                                exact
                                path="/auction/:id"
                                component={Auction}
                            />
                            <Route exact path="/" render={redirectToHome} />
                        </Switch>
                    </App>
                </LoadingWrapper>
            </ConnectedRouter>
        </DrizzleProvider>
    );
}

RouterConfig.propTypes = {
    history: PropTypes.object.isRequired
};

export default RouterConfig;
