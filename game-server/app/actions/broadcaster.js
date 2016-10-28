var sceneService = require('../services/scene');

module.exports = function BroadcasterAction(broadcaster) {
	this.broadcaster = broadcaster;
}

BroadcasterAction.prototype.createGame = function(room_id, callback) {
	sceneService.createGame(this.broadcaster, room_id, callback);
};

BroadcasterAction.prototype.getPlayerNumber = function(room_id, callback) {
	var num = sceneService.getNumberOfPlayers(room_id);
	callback(num);
};

BroadcasterAction.prototype.startGame = function(room_id, callback) {
	sceneService.start(room_id, callback);
};
