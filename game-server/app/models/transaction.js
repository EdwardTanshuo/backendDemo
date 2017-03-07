var mongoose = require('mongoose');

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



//TransactionSchema.pre('save', function(next) {
//    console.log("pre!!!!!!!!!!!!!!!!!!!!!!!")
//    this.quantity = Math.abs(this.quantity);
//    if (this.type !== 'Refill' && this.type !== 'Coupon' && this.type !== 'Reward'){
//        this.quantity *= -1;
//    }
//    next();
//});

var Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;