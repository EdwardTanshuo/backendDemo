var mongoose = require('mongoose');

var SceneSchema = mongoose.Schema({
    room: {type: String, required: true},                       //所在房间
    turns: {type: Number, required: true, default: 0},          //回合数
    status: {type: String, required: true, default: 'init'},    //状态
    dealer: {type: Object, required: false},                    //主播信息
    dealer_platfrom: {type: Array, required: false},            //主播抽卡记录
    dealer_value: {type: Object, required: false},              //主播输赢
    dealer_bets: {type: Number, required: false},               //主播下注
    dealer_deck: {type: Array, required: false},                //主播剩余卡片
    rank: {type: Array, required: false},                       //总排名
    durationBet: {type: Number, required: false},               //下注倒计时
    durationPlayerTurn: {type: Number, required: false},        //玩家抽卡倒计时
    durationDealerTurn: {type: Number, required: false}         //主播抽卡倒计时
});

var Scene = mongoose.model('Scene', SceneSchema);

module.exports = Scene;