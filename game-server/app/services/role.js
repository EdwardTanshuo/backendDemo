var Role = require('../models/role');
var dataSyncService = require('./dataSync');

function RoleService() {
}

RoleService.prototype.auth = function(token, callback) {
	if(token == null){
		return callback('missing token', null);
	}
	this.syncFromRemote(token, callback);
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
	Role.findOne({foreignId: role.id}, callback);
};

RoleService.prototype.syncFromRemote = function(token, callback) {
	console.log('sync user from server cache...');
	return dataSyncService.syncRoleFromRemote(token, callback);
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