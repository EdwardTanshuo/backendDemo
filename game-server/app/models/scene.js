var mongoose = require('mongoose');

var SceneSchema = mongoose.Schema({
    room: {type: String, required: true},
    turns: {type: Number, required: true, default: 0},
    status: {type: String, required: true, default: 'init'},
    players: {type: Object, required: false},
    player_platfroms: {type: Object, required: false},
    player_values: {type: Object, required: false},
    player_bets: {type: Object, required: false},
    dealer: {type: Object, required: false},
    dealer_platfrom: {type: Array, required: false},
    dealer_value: {type: Object, required: false},
    dealer_bets: {type: Number, required: false},
    dealer_deck: {type: Array, required: false},
    durationBet: {type: Number, required: false},
    durationPlayerTurn: {type: Number, required: false},
    durationDealerTurn: {type: Number, required: false}
});

var Scene = mongoose.model('SceneSchema', SceneSchema);

module.exports = Scene;