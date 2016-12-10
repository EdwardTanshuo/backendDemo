var game = require('../console/game');

module.exports = function RoleAction(session) {
	this.session = session;
	this.bet = function(room_id, callback) {
		app.rpc.scene.sceneRemote.playerBet(this.session, {broadcaster: this.session.get('currentBroadcaster'), room_id: this.session.get('room')}, function(err, result){
			if(err == null && result == null){
				return;
			}
		});
	};

	this.leave = function(room_id, callback) {
		app.rpc.scene.sceneRemote.playerLeave(this.session, {room_id: this.session.get('room')}, function(err, result){
			if(err == null && result == null){
				return;
			}
		});
	};

	this.finish = function(room_id, callback) {
		app.rpc.scene.sceneRemote.playerFinish(this.session, {room_id: this.session.get('room')}, function(err, result){
			if(err == null && result == null){
				return;
			}
		});
	};

	this.draw = function(room_id, callback) {
		var deck = [];
		try{
			var result = roleDeckCollection.find({token: this.session.get('token')});
			if(!result){
				return callback('can not find deck');
			}
			deck = result.deck;
			if(!deck){
				return callback('deck is null');
			}
		}
		catch(e){
			return callback(e);
		}

		app.rpc.scene.sceneRemote.playerDraw(this.session, {room_id: this.session.get('room'), deck: deck}, function(err, result){
			if(err == null && result == null){
				return;
			}
			if(result){
				try{
					var new_model = {};
					new_model.deck = result.new_deck;
					new_model.token =  this.session.get('token');
					roleDeckCollection.update(new_model);
				}
				catch(e){
					callback(e);
				}
				return callback(null, result.new_deck, result.result);
			}
			else{
				return callback(err);
			}
		});
	};
}
