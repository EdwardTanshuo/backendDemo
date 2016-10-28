
var Broadcaster = require('../models/broadcaster');
var dataSyncService = require('./dataSync');

function BroadcasterService() {
}

BroadcasterService.prototype.auth = function(token, callback) {
	if(token == null){
		return callback('missing token', null);
	}
	this.syncFromRemote(token, callback);
};

BroadcasterService.prototype.getBroadcatertByRoom = function(room_id, callback) {
	
};

BroadcasterService.prototype.create = function(data, callback) {
	try{
		var broadcaster = Broadcaster(data);
		broadcaster.save(callback);
		console.log('creating broadcaster in server cache...');
	}
	catch(err){
		callback(err, null);
	}
};


BroadcasterService.prototype.hasOne = function(broadcaster, callback) {
	console.log('finding broadcaster from server cache...');
	Broadcaster.findOne({room: broadcaster.room}, callback);
};

BroadcasterService.prototype.syncFromRemote = function(room_id, callback) {
	console.log('sync user from server cache...');
	return dataSyncService.syncBroadcasterFromRemote(room_id, callback);
};

BroadcasterService.prototype.save = function(broadcaster, callback) {
	try{
		broadcaster.save(callback);
	}
	catch(err){
		callback(err, null);
	}
	
};

BroadcasterService.prototype.initFromRemote = function(data, callback) {
	
};



module.exports = new BroadcasterService();