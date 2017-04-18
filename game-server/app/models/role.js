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
    level : {type: Number, required: false, "default": 0},
    bag : {type: Object, required: false, "default": {}},
    deckId: {type: String, required: false, default: "default"},
    intimacy: {type: Number, required: false, "default": 0},
    follow: {type: Boolean, required: false, "default": false}
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