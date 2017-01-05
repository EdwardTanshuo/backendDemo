var game = require('../console/game');

module.exports = function RoleAction(session) {
	this.session = session;


	this.bet = function(bet, callback) {
        var self = this;
        var roomId = self.session.get('room');
        var role = self.session.get('currentRole');

		app.rpc.scene.sceneRemote.playerBet(self.session, roomId, role, bet, function(err, result){
            if(err){
                return callback(err);
            }
            return callback(null, result.transaction, result.bet);
		});
	};

	this.leave = function(callback) {
        var self = this;
        var roomId = self.session.get('room'),
            currentRole= self.session.get('currentRole');

        app.rpc.scene.sceneRemote.playerLeave(session, roomId, currentRole, function(err, result){
            if(err){
                logger.error('player leave error! %j', err);
            }
            return callback(null, result.player_platfrom, result.player_value, result.player_bet, result.player);
        });
	};

	this.finish = function(roomId, callback) {
		app.rpc.scene.sceneRemote.playerFinish(this.session, {room_id: this.session.get('room')}, function(err, result){
			if(err == null && result == null){
				return;
			}
		});
	};

	this.draw = function(roomId, callback) {
		var self = this;
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
			return callback('playerDraw: crash when query memdb');
		}

		app.rpc.scene.sceneRemote.playerDraw(self.session, {roomId: self.session.get('room'), deck: deck, token: self.session.get('token')}, function(err, result){
			if(err == null && result == null){
				return;
			}
			if(!err){
				if(!result.newDeck){
					return callback('playerDraw: deck is null');
				}
				try{
					var old_model = roleDeckCollection.findOne({token: self.session.get('token')});
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
