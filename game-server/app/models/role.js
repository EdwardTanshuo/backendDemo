var mongoose = require('mongoose');

var RoleSchema = mongoose.Schema({
    //profile
    name: {type: String, required: true},
    avatar: {type: String, required: false},
    wealth: {type: Number, required: true},
    //verification
    foreignId: {type: Number, required: true},
    token: {type: String, required: true, unique: true},
    //game
    exp : {type: Number, required: false, "default": 0},
    level : {type: Number, required: false, "default": 0},
    bag : {type: Object, required: false, "default": {}}
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