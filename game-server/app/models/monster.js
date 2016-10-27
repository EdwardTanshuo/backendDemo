var mongoose = require('mongoose');

var MonsterSchema = mongoose.Schema({
    name: {type: String, required: true},
    thumb: {type: String, required: false},
    model: {type: String, required: false},
    value: {type: Number, required: true},
    foreignId: {type: Number, required: true},
    deckId: {type: String, required: false}
    type: {
        type: String,
        'enum': ['NORMAL', 'SUPER', 'TRANSFORM']
    },
    level: {
        type: String,
        'enum': ['LOW', 'HIGH']
    },
    weight: {type: Number, required: true, default: 1.0},
    skill: {type: String, required: false} 
});

var Monster = mongoose.model('Monster', MonsterSchema);

module.exports = Monster;