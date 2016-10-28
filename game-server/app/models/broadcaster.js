var mongoose = require('mongoose');

var BroadcasterSchema = mongoose.Schema({
    room: {type: String, required: true, unique: true},
    name: {type: String, required: true},
    bio: {type: String, required: false},
    location: {type: String, required: false},
    password: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    isDeleted: {type: Boolean, required: true,default: false}
});




BroadcasterSchema.pre('save', true, function(next, done) {
    ///todo; add sync script
    next();
    done();
});


var Broadcaster = mongoose.model('Broadcaster', BroadcasterSchema);

module.exports = Broadcaster;