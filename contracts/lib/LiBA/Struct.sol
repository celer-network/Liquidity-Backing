pragma solidity ^0.5.1;

library LiBAStruct {
    struct Bid {
        bytes32 hash;
        uint commitmentId;
        uint rate;
        uint value;
        uint celerValue;
    }

    struct Auction {
        address payable asker;
        address tokenAddress;
        address collateralAddress;
        uint collateraValue;
        uint value;
        uint duration;
        uint maxRate;
        uint minValue;
        bool finalized;
        address[] bidders;
        address[] winners;
        address topLoser;
        uint challengeDuration;
        uint finalizeDuration;
        uint bidEnd;
        uint revealEnd;
        uint claimEnd;
        uint challengeEnd;
        uint finalizeEnd;
        uint lendingStart; // The timestamp when lending starts
        uint feeDeposit;
    }
}
