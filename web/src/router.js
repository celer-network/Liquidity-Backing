import React from 'react';
import PropTypes from 'prop-types';
import { Router, Switch, Route, Redirect } from 'dva/router';
import Dynamic from 'dva/dynamic';
import { DrizzleProvider } from 'drizzle-react';
import { LoadingContainer } from 'drizzle-react-components'
import { Spin } from 'antd'

import App from './App';
import contractOptions from './utils/contracts';

const redirectToHome = () => <Redirect to="/polc" />;

function RouterConfig({
  history, app,
}) {
  const Polc = Dynamic({
    app,
    component: () => import('./routes/polc'),
  });


  return (
    <DrizzleProvider options={contractOptions} store={app._store}>
      <Router history={history}>
        <LoadingContainer loadingComp={Spin}>
          <App>
            <Switch>
              <Route exact path="/polc" component={Polc} />
              <Route exact path="/" render={redirectToHome} />
            </Switch>
          </App>
        </LoadingContainer>
      </Router>
    </DrizzleProvider>
  );
}

RouterConfig.propTypes = {
  history: PropTypes.object.isRequired,
};

export default RouterConfig;