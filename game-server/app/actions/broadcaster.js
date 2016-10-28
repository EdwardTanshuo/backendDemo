module.exports = function BroadcasterAction(session) {
	this.session = session;
	this.createGame = function(room_id, callback) {
		app.rpc.scene.sceneRemote.createGame(this.session, {broadcaster: this.session.get('currentBroadcaster'), room_id: this.session.get('room')}, callback);
	};

	this.getPlayerNumber = function(room_id, callback) {
		app.rpc.scene.sceneRemote.getNumberOfPlayers(this.session, {room_id: this.session.get('room')}, callback);
	};

	this.startGame = function(room_id, callback) {
		app.rpc.scene.sceneRemote.startGame(this.session, {room_id: this.session.get('room')}, callback);
	};
}


