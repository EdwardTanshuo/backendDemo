var mongoose = require('mongoose');

var SceneSchema = mongoose.Schema({
    room: {type: String, required: true},
    turns: {type: Number, required: true, default: 0},
    broad: {type: String, required: true}
});

var Scene = mongoose.model('SceneSchema', SceneSchema);

module.exports = Scene;