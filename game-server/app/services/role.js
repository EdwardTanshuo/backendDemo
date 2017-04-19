var Role = require('../models/role');
var dataSyncService = require('./dataSync');
var Code = require('../../../shared/code');

function RoleService() {
}

RoleService.prototype.auth = function(room, token, callback) {
	if(token == null){
		return callback({code: Code.COMMON.LESS_PARAM, msg: 'addPlayer: missing token' });
	}
	this.syncFromRemote(room, token, callback);
};

RoleService.prototype.getRoleByToken = function(token, callback) {
	
};

RoleService.prototype.create = function(data, callback) {
	try{
		var role = Role(data);
		role.save(callback);
		console.log('creating user in server cache...');
	}
	catch(err){
		callback(err, null);
	}
};

RoleService.prototype.hasOne = function(role, callback) {
	console.log('finding user from server cache...');
	Role.findOne({token: role.token}, callback);
};

RoleService.prototype.syncFromRemote = function(room, token, callback) {
	console.log('sync user from server cache...');
	return dataSyncService.syncRoleFromRemote(room, token, callback);
};

RoleService.prototype.save = function(role, callback) {
	try{
		role.save(callback);
	}
	catch(err){
		callback(err, null);
	}
	
};

RoleService.prototype.initFromRemote = function(data, callback) {
	
};



module.exports = new RoleService();