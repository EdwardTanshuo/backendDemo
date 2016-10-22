var mongoose = require('mongoose');

var SceneSchema = mongoose.Schema({
    room: {type: String, required: true},
});

var Scene = mongoose.model('SceneSchema', RoleSchema);

module.exports = Scene;