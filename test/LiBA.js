const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Web3 = require('web3');

const ERC20ExampleToken = artifacts.require('ERC20ExampleToken');
const LiBA = artifacts.require('LiBA');

chai.use(chaiAsPromised);
const assert = chai.assert;
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const AUCTION_DEPOSIT = 100;
const BID_DURATION = 8;
const REVEAL_DURATION = 2;
const CLAIM_DURATION = 2;
const CHALLENGE_DURATION = 2;
const FINALIZE_DURATION = 2;
const VALUE = 5;
const DURATION = 1;
const MAX_RATE = 10;
const MIN_VALUE = 2;
const BID0 = {
  rate: 5,
  value: VALUE,
  celerValue: 2,
  salt: 100,
};
const BID1 = {
  ...BID0,
  value: 4,
};

const calculateBidHash = (bid) => {
  const { rate, value, celerValue, salt } = bid;
  bid.hash = web3.utils.soliditySha3(rate, value, celerValue, salt);
};

calculateBidHash(BID0);
calculateBidHash(BID1);

contract('LiBA', function ([provider, bidder0, bidder1]) {
  let liba;
  let token;
  let auctionId;

  const placeBid = async (bid, bidder, eventName) => {
    await token.approve(liba.address, bid.celerValue, { from: bidder });
    const receipt = await liba.placeBid(
      auctionId,
      bid.hash,
      bid.celerValue, {
        from: bidder,
      }
    );
    const { event, args } = receipt.logs[0];
    assert.equal(event, eventName);
    assert.equal(args.auctionId.toNumber(), auctionId);
    assert.equal(args.bidder, bidder);
  };

  before(async function () {
    token = await ERC20ExampleToken.new();
    liba = await LiBA.new(token.address, AUCTION_DEPOSIT);
    await token.transfer(provider, 1000);
    await token.transfer(bidder0, 1000);
    await token.transfer(bidder1, 1000);
  });

  it('should fail to init auction if no auction deposit', async () => {
    try {
      await liba.initAuction(
        BID_DURATION,
        REVEAL_DURATION,
        CLAIM_DURATION,
        CHALLENGE_DURATION,
        FINALIZE_DURATION,
        VALUE,
        DURATION,
        MAX_RATE,
        MIN_VALUE
      );
    } catch (e) {
      assert.isAbove(e.message.search('VM Exception while processing transaction'), -1);
      return;
    }

    assert.fail('should have thrown before');
  });

  it('should init auction successfully', async () => {
    await token.approve(liba.address, AUCTION_DEPOSIT * 10);
    const receipt = await liba.initAuction(
      BID_DURATION,
      REVEAL_DURATION,
      CLAIM_DURATION,
      CHALLENGE_DURATION,
      FINALIZE_DURATION,
      VALUE,
      DURATION,
      MAX_RATE,
      MIN_VALUE
    );

    const { event, args } = receipt.logs[0];
    auctionId = args.auctionId.toNumber();
    assert.equal(event, 'NewAuction');
    assert.equal(args.asker, provider);
    assert.equal(auctionId, 0);
  });

  it('should fail to bid auction for invalid auction id', async () => {
    try {
      await liba.placeBid(
        100,
        BID0.hash,
        BID0.celerValue
      );
    } catch (e) {
      assert.isAbove(e.message.search('auctionId must be valid'), -1);
      return;
    }

    assert.fail('should have thrown before');
  });

  it('should fail to bid auction for no celer token', async () => {
    try {
      await liba.placeBid(
        1,
        BID0.hash,
        BID0.celerValue
      );
    } catch (e) {
      assert.isAbove(e.message.search('VM Exception while processing transaction'), -1);
      return;
    }

    assert.fail('should have thrown before');
  });

  it('should bid auction correctly', async () => {
    await placeBid(BID0, bidder0, 'NewBid');
    await placeBid(BID1, bidder1, 'NewBid');
  });

  it('should update bid correctly', async () => {
    await placeBid(BID0, bidder0, 'UpdateBid');
  });

  it('should fail to bid auction for bid duration', async () => {
    try {
      await liba.placeBid(
        auctionId,
        BID0.hash,
        BID0.celerValue
      );
    } catch (e) {
      assert.isAbove(e.message.search('must be within bid duration'), -1);
      return;
    }

    assert.fail('should have thrown before');
  });
});
