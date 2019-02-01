import React from 'react';
import PropTypes from 'prop-types';
import { drizzleConnect } from 'drizzle-react';


class Polc extends React.Component {
  handlePageChange = () => {

  }

  render() {
    const { consent } = this.props;
    console.log(this.props)
    return (
      <div>Test</div>
    );
  }
}


Polc.propTypes = {
  dispatch: PropTypes.func.isRequired
};

function mapStateToProps(state) {
  console.log(state)

  return {}
}

export default drizzleConnect(Polc, mapStateToProps);