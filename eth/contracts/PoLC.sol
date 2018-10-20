// pragma solidity ^0.4.18;

// import "zeppelin-solidity/contracts/math/SafeMath.sol";
// import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
// import "zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

// contract PoLC {
//     using SafeERC20 for ERC20;
//     using SafeMath for uint256;

//     struct Commitment {
//         uint lockStart;
//         uint lockEnd;
//         uint lockedValue;
//         uint availableValue;
//         uint lendingValue;
//         uint withdrawedReward;
//     }

//     address private celerTokenAddress;
//     // reward payout for each block
//     uint private blockReward;
//     // mapping mining power by day
//     mapping(uint => uint) private powerByTime;
//     // mapping user address to its commitments
//     mapping(
//         address => mapping (uint => Commitment)
//     ) private commitmentsByUser;

//     constructor(address _celerTokenAddress, uint _blockReward) {
//         celerTokenAddress = _celerTokenAddress;
//         blockReward = _blockReward;
//     }

//     event NewCommitment(uint commitmentId);

//     /**
//      * @dev check if the commitment lock has expired
//      * @param _commitmentId ID of the commitment
//      */
//     modifier lockExpired(uint _commitmentId) {
//         Commitment commitment = commitmentsByUser[msg.sender][_commitmentId];
//         require(
//             commitment.lockEnd != 0,
//             "commitment must exist"
//         );
//         require(
//             commitment.lockEnd < block.timestamp,
//             "commitment lock must expire"
//         );
//         _;
//     }

//    /**
//      * @dev Lock fund into the PoLC contract
//      * @param _duration lock-in duration by days
//      */
//     function commitFund(uint _duration) public payable {
//         require(
//             msg.value > 0,
//             "must send the transcation with eth value"
//         );
//         require(
//             _duration > 0 && _duration < 365,
//             "duration must fall into the 0-365 range"
//         );

//         Commitment commitment = commitmentsByUser[msg.sender][block.timestamp];
//         require(
//             commitment.lockEnd == 0,
//             "one timestamp can only have one commitment"
//         );

//         uint lockStart = block.timestamp.div(1 days).add(1);
//         uint lockEnd = lockStart.add(_duration);
//         commitment.lockStart = lockStart;
//         commitment.lockEnd = lockEnd;
//         commitment.lockedValue = msg.value;
//         commitment.availableValue = msg.value;

//         uint power = msg.value.mul(_duration);
//         for (uint i = lockStart; i < lockEnd; i++) {
//             powerByTime[i] = powerByTime[i].add(power);
//         }

//         NewCommitment(block.timestamp);
//     }

//   /**
//      * @dev withdraw all available fund in a commitment
//      * @param _commitmentId ID of the commitment
//      */
//     function withdrawFund(
//         uint _commitmentId
//     )
//         public
//         lockExpired(_commitmentId)
//     {
//         Commitment commitment = commitmentsByUser[msg.sender][_commitmentId];
//         uint availableValue = commitment.availableValue;
//         commitment.availableValue = 0;
//         msg.sender.transfer(availableValue);
//     }

//   /**
//      * @dev withdraw all available reward in a commitment
//      * @param _commitmentId ID of the commitment
//      */
//     function withdrawReward(
//         uint _commitmentId
//     )
//         public
//         lockExpired(_commitmentId)
//     {
//         Commitment commitment = commitmentsByUser[msg.sender][_commitmentId];
//         uint totalReward = 0;

//         uint power = commitment.lockedValue * (commitment.lockEnd - commitment.lockStart);
//         for (uint i = commitment.lockStart; i < commitment.lockEnd; i++) {
//             totalReward = totalReward.add(blockReward * power / powerByTime[i]);
//         }

//         commitment.withdrawedReward = totalReward;
//         // ERC20(celerTokenAddress).safeTransferFrom(address(this), msg.sender, totalReward);
//     }
// }
