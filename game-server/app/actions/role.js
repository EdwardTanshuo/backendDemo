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
			var result = roleDeckCollection.findOne({token: this.session.get('token')});
			if(!result){
				return callback('playerDraw: can not find deck');
			}
			deck = result.deck;
			if(!deck){
				return callback('playerDraw: crash when query memdb');
			}
		}
		catch(e){
			return callback(e);
		}

		var self_session = this.session;
		app.rpc.scene.sceneRemote.playerDraw(self_session, {roomId: self_session.get('room'), deck: deck, token: self_session.get('token')}, function(err, result){
			if(err == null && result == null){
				return;
			}
			if(!err){
				if(!result.newDeck){
					return callback('playerDraw: deck is null');
				}
				try{
					var old_model = roleDeckCollection.find({token: self_session.get('token')});
					old_model.deck = result.newDeck;
					roleDeckCollection.update(old_model);
				}
				catch(e){
					return callback('playerDraw: crash when update memdb');
				}
				return callback(null, result.newDeck, result.card, result.value);
			}
			else{
				return callback(err);
			}
		});
	};
}
