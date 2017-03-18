var mongoose = require('mongoose');

var dataSyncService = require('../services/dataSync');

var TransactionSchema = mongoose.Schema({
    quantity: Number,
    type: {  // 交易类型 Bet-下注，Reward-获得奖励, Tie-平局退还下注金额
        type: String
    },
    userId: {   //交易发起人
        type: String,
        ref: 'User'
    },
    roomId: {  //收款人
        type: String
    },
    sceneId: {
        type: String
    },
    createdAt: { type: Date, default: Date.now, required: true}
});



TransactionSchema.post('save', function() {
    console.log("post save!!!!!!!!!!!!!!!!!!!!!!!")
    var transaction = {
        userId: this.userId,
        quantity: this.quantity,
        type: this.type,
        roomId: this.roomId,
        createdAt: this.createdAt
    };
    dataSyncService.syncTransactionToRemote(transaction, function(err){
        if(!!err){
            console.log('syncTransactionToRemote when transaction post save :'+ err);
        }
    });
});

var Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;