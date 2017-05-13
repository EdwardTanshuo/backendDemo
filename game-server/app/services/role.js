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


RoleService.prototype.removeArrayFromCache = function(list) {
	list.map((aRole) => {
        roleCollection.remove(aRole);
    });
};

RoleService.prototype.getAll = function(roomId) {
	return roleCollection.find({room: roomId});
};

RoleService.prototype.getAllInGame = function(roomId) {
	return roleCollection.find({room: roomId, inGame: true});
};

RoleService.prototype.getOne = function(role, roomId) {
	return roleCollection.findOne({token: role.token, room: roomId});
};

RoleService.prototype.getOneInGame = function(role, roomId) {
	return roleCollection.findOne({token: role.token, room: roomId, inGame: true});
};

RoleService.prototype.addIntoCache = function(role) {
	roleCollection.insert(role);
};

RoleService.prototype.removeFromCache = function(role) {
	roleCollection.remove(role);
};

RoleService.prototype.update = function(role) {
	roleCollection.update(role);
};

RoleService.prototype.resetGameInfo = function(role) {
	role.player_bet = 0;
    role.player_platfrom = [];
    role.inGame = false;
    role.player_value = {value: 0, busted: false, numberOfHigh: 0};
	roleCollection.update(role);
	return role;
};

RoleService.prototype.initGameInfo = function(role) {
    roleCollection.insert({
    	name: role.name,
    	avatar: role.avatar,
    	token: role.token,
    	withdraw_gift_number: role.withdraw_gift_number,
    	intimacy: role.intimacy,
    	follow: role.follow,
    	wealth: role.wealth,
    	diamond: role.diamond,
    	room: role.room,
    	sid: role.sid,
    	inGame: false,
    	player_platfrom: [],
    	player_value: {value: 0, busted: false, numberOfHigh: 0},
    	player_bet: 0
    });
    return role;
};

module.exports = new RoleService();