var mongoose = require('mongoose');

var dataSyncService = require('./services/dataSync');

var TransactionSchema = mongoose.Schema({
    quantity: Number,
    type: {  // 交易类型 下注， 获得奖励
        type: String,
        'enum': ['Bet', 'Reward']
    },
    userd: {   //交易发起人
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    roomId: {  //收款人
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Broadcaster'
    },
    createdAt: { type: Date, default: Date.now, required: true}
});



TransactionSchema.post('save', function() {
    console.log("post save!!!!!!!!!!!!!!!!!!!!!!!")
    this.quantity = Math.abs(this.quantity);
    var transaction = {
        userId: this.userId,
        quantity: this.bet,
        type: this.type,
        roomId: this.roomId,
        createdAt: this.createdAt
    }
    dataSyncService.syncTransactionToRemote(transaction, function(err){
        if(!!err){
            console.log('syncTransactionToRemote when transaction post save :'+ err);
        }
    });
});

var Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;