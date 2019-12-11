import React from 'react';
import { Card, Statistic } from 'antd';

function AccountInfo(props) {
  const { celrValue } = props


  return (
    <Card className="account-info" title="Account info">
        <Statistic
          title="CELR allowance"
          value={celrValue}
        />
    </Card>
  )
}

export default AccountInfo;