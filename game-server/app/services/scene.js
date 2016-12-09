var Scene = require('../models/scene');
var game = require('../console/game');
var channelService = app.get('channelService');

function SceneService() {
}

SceneService.prototype.createGame = function(dealer, room_id, callback) {
	var scene = sceneCollection.findOne({'room': room_id});
	if(scene){
		return callback('game has been created', scene);
	}
	else{
		var new_scene = new Scene();
		new_scene.room = room_id;
		new_scene.status = 'init';

		new_scene.players = {};
		new_scene.player_platfroms = {};
		new_scene.player_values = {};
		new_scene.player_bets = {};
		
		new_scene.dealer = dealer;
		new_scene.dealer_platfrom = [];
		new_scene.dealer_value =  {value: 0, busted: false, numberOfHigh: 0};
		new_scene.dealer_bets = 0;
		
		new_scene.turns = 0;
	
		try{
			sceneCollection.insert(new_scene);
			channelService.createChannel(room_id);
			return callback(null, new_scene);
		}
		catch(err){
			return callback(err, null);
		}
	}
}

SceneService.prototype.endGame = function(dealer, room_id, callback) {
	var scene = sceneCollection.findOne({'room': room_id});
	if(!scene){
		return callback('game has not been created', scene);
	}
	else{
		try{
			sceneCollection.remove(scene);
			channelService.destroyChannel(room_id);
			return callback(null, scene);
		}
		catch(err){
			return callback(err, null);
		}
	}
}

SceneService.prototype.getNumberOfPlayers = function(room_id){
	var scene = sceneCollection.findOne({'room': room_id});
	if(!scene){
		return 0;
	}
	return scene.players.length();
}

SceneService.prototype.nextTurn = function(room_id, callback){
	try{
		var scene = sceneCollection.findOne({'room': room_id});
		if(!scene){
			return callback('no scene', null);
		}
		scene.turns = scene.turns + 1;
		sceneCollection.update(scene);
		callback(null, scene);
	}
	catch(err){
		callback(err, null);
	}
}

SceneService.prototype.addPlayer = function(room_id, role, callback){
	try{
		var scene = sceneCollection.findOne({'room': room_id});

		if(!scene){
			return callback('no scene', null);
		}
		
		//如果玩家已加入游戏， 返回当前游戏状态
		try{
			if(scene.players[role.token] != null){
				return callback(null, scene);
			}
		}
		catch(e){

		}

		//否则创建新的玩家状态
		scene.players[role.token] = role;
		scene.player_platfroms[role.token] = [];
		scene.player_values[role.token] = {value: 0, busted: false, numberOfHigh: 0};
		scene.player_bets[role.token] = 0;

		sceneCollection.update(scene);
		callback(null, scene);
	}
	catch(err){
		callback(err, null);
	}
}

SceneService.prototype.startGame = function(room_id, callback){
	try{
		var scene = sceneCollection.findOne({'room': room_id});
		if(!scene){
			return callback('no scene', null);
		}
		if(scene.status != 'init'){
			return callback('game is not at init', null);
		}
		scene.status = 'started';
		sceneCollection.update(scene);
		callback(null, scene);
	}
	catch(err){
		callback(err, null);
	}
}

SceneService.prototype.removePlayer = function(room_id, role, callback){
	try{
		var scene = sceneCollection.findOne({'room': room_id});
		if(!scene){
			return callback('no scene', null);
		}
		if(scene.players[role.token] == null){
			return callback('player is not inside', null);
		}
		
		var player = scene.players[role.token];
		scene.players[role.token] = null;

		var player_platfrom = scene.player_platfroms[role.token];
		scene.player_platfroms[role.token] = null;

		var player_value = scene.player_values[role.token];
		scene.player_values[role.token] = null;

		var player_bet = scene.player_bets[role.token];
		scene.player_bets[role.token] = null;

		sceneCollection.update(scene);
		callback(null, {player_platfrom: player_platfrom, player_value: player_value, player_bet: player_bet, player: player});

	}
	catch(err){
		callback(err, null);
	}

}

SceneService.prototype.removeAllPlayers = function(room_id,callback){

}

module.exports = new SceneService();