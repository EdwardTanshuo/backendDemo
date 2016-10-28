var mongoose = require('mongoose');

var SceneSchema = mongoose.Schema({
    room: {type: String, required: true},
    turns: {type: Number, required: true, default: 0},
    status: {type: String, required: true, default: 'init'}
});

var Scene = mongoose.model('SceneSchema', SceneSchema);

module.exports = Scene;