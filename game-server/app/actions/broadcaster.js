var sceneService = require('../services/scene');

module.exports = function BroadcasterAction(broadcaster) {
	this.broadcaster = broadcaster;
}

module.exports.prototype.createGame = function(room_id, callback) {
	sceneService.createGame(this.broadcaster, room_id, callback);
};

module.exports.prototype.getPlayerNumber = function(room_id, callback) {
	var num = sceneService.getNumberOfPlayers(room_id);
	callback(num);
};

module.exports.prototype.startGame = function(room_id, callback) {
	sceneService.start(room_id, callback);
};
