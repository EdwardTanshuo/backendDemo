var mongoose = require('mongoose');

var RoleSchema = mongoose.Schema({
    //profile
    name: {type: String, required: true},
    avatar: {type: String, required: false},
    diamond: {type: Number, required: false, "default": 0},
    wealth: {type: Number, required: false, "default": 0},
    //verification
    foreignId: {type: Number, required: false},
    token: {type: String, required: true, unique: true},
    //game
    exp : {type: Number, required: false, "default": 0},
    next_level_experience : {type: Number, required: false, "default": 0},
    level : {type: Number, required: false, "default": 0},
    bag : {type: Object, required: false, "default": {}},
    deckId: {type: String, required: false, default: "default"},
    intimacy: {type: Number, required: false, "default": 0},
    follow: {type: String, required: false, "default": "0"},
    withdraw_gift_number: {type: Number, required: false, "default": 0},
    //cache
    player_platfrom: {type: Array, required: false, "default": []},          //玩家抽卡记录
    player_value: {type: Object, required: false, "default": {}},            //玩家当前的输赢情况
    player_bet: {type: Number, required: false, "default": 0},               //玩家当前的下注
});


RoleSchema.methods.getBalance = function () {
    return this.wealth
};

RoleSchema.pre('save', true, function(next, done) {
    ///todo; add sync script
    next();
    done();
});


var Role = mongoose.model('Role', RoleSchema);

module.exports = Role;