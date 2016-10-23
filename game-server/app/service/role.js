var Role = require('../model/role');
var dataSyncService = require('./dataSync');

function RoleService() {
}

RoleService.prototype.auth = function(token, callback) {
	if(data.token == null){
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
	}
	catch(err){
		callback(err, null);
	}
};

RoleService.prototype.hasRecord = function(role, callback) {
	Role.findOne({foreignId: role.id}, callback);
};

RoleService.prototype.syncFromRemote = function(token, callback) {
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