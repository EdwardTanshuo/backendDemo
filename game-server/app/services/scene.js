var Scene = require('../models/scene');
var game = require('../console/game');
var channelService = app.get('channelService');
var sceneConfig = require('../../config/scene');

function pushMessages(roomId, msg, route, callback){
	var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    channel.pushMessage(route, msg, callback);
}

function SceneService() {
}

//直播创建游戏
SceneService.prototype.createGame = function(dealer, roomId, callback) {
	var scene = sceneCollection.findOne({'room': roomId});
    //主播 非主观意图断开游戏，重新加入
	if(scene){
        return callback('createGame: game has been created', scene);
	}
	else{
		var new_scene = new Scene();
		new_scene.room = roomId;
		new_scene.status = 'init';

		new_scene.players = {};
		new_scene.player_platfroms = {};
		new_scene.player_values = {};
		new_scene.player_bets = {};
		
		new_scene.dealer = dealer;
		new_scene.dealer_platfrom = [];
		new_scene.dealer_value =  {value: 0, busted: false, numberOfHigh: 0};
		new_scene.dealer_bets = 0;
		new_scene.dealer_deck = [];

		new_scene.turns = 0;
	
		try{
			sceneCollection.insert(new_scene);
            return callback(null, new_scene);
		} catch(err){
			return callback(err, null);
		}
	}
}

//直播开始游戏
SceneService.prototype.startGame = function(roomId, callback){
    try {
    	var self = this;
        var scene = sceneCollection.findOne({'room': roomId});
        if (!scene) {
            return callback('startGame: no scene created yet', null);
        }
        if (scene.status != 'init') {
            return callback('game is not at init', null);
        }
        scene.status = 'player_started';
        sceneCollection.update(scene);

        pushMessages(roomId, scene, 'GameStartEvent', function(err){
        	if(!!err){
        		callback(err, null);
        	}
        	else{
        		 //开启计时器
		        setTimeout(function(roomId) {
		        	//self.endPlayerTurn(roomId);
				 	console.log(roomId);
				}, 60000, roomId);
		        return callback(null, scene);
        	}
        });
    } catch(err){
        callback(err, null);
    }
}

SceneService.prototype.endPlayerTurn = function(roomId, callback){
    try {
    	var self = this;
        var scene = sceneCollection.findOne({'room': roomId});
        if (!scene) {
            return callback('startGame: no scene created yet', null);
        }
        if (scene.status != 'player_started') {
            return callback('game is not at player turn', null);
        }
        scene.status = 'dealer_turn';
        sceneCollection.update(scene);

        //开启计时器
        setTimeout(function(roomId) {
        	//self.endGame(roomId);
		 	console.log(roomId);
		}, 60000, roomId);

        return callback(null, scene);
    } catch(err){
        callback(err, null);
    }
}

SceneService.prototype.endGame = function(roomId, callback) {
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('game not exist', scene);
        } else {
            sceneCollection.remove(scene);
            return callback(null, scene);
        }
    } catch(err){
        return callback(err, null);
    }
}

SceneService.prototype.addPlayer = function(roomId, role, serverId, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene', null);
        }
        //如果玩家已加入游戏， 返回当前游戏状态
        if(scene.players[role.token] != null){
            return callback(null, scene);
        }
        //否则创建新的玩家状态
        role.sid = serverId;
        scene.players[role.token] = role;
        scene.player_platfroms[role.token] = [];
        scene.player_values[role.token] = {value: 0, busted: false, numberOfHigh: 0};
        scene.player_bets[role.token] = 0;
        sceneCollection.update(scene);
        callback(null, scene);

    } catch(err){
        return callback('memdb error when add player', null);
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

SceneService.prototype.removePlayer = function(room_id, role, callback, serverId){
	try{
		var scene = sceneCollection.findOne({'room': room_id});
		if(!scene){
			return callback('no scene', null);
		}
		if(scene.players[role.token] == null){
			return callback('player is not inside', null);
		}
		
		var player = scene.players[role.token];
		delete scene.players[role.token];

		var player_platfrom = scene.player_platfroms[role.token];
		delete scene.player_platfroms[role.token];

		var player_value = scene.player_values[role.token];
		delete scene.player_values[role.token];

		var player_bet = scene.player_bets[role.token];
		delete scene.player_bets[role.token];

		sceneCollection.update(scene);
		callback(null, {player_platfrom: player_platfrom, player_value: player_value, player_bet: player_bet, player: player});

	}
	catch(err){
		callback(err, null);
	}

}

SceneService.prototype.addBet = function(room_id, token, callback){

}

SceneService.prototype.playerDraw = function(room_id, token, deck, callback){
	try{
		var scene = sceneCollection.findOne({'room': room_id});
		if(!scene){
			return callback('no scene', null);
		}
		if(scene.players[token] == null){
			return callback('player is not inside', null);
		}
		if(scene.status != 'player_started'){
			return callback('game has not started yet', null);
		}
		game.dealNextCard(deck, function(err, new_deck, result){
			callback(err, new_deck, result);
		});
	}
	catch(err){
		callback(err, null);
	}
}

SceneService.prototype.playerFinish = function(room_id, token, callback){
	
}

SceneService.prototype.dealerDrawCard = function(roomId, deck, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene', null);
        }
        //if(scene.players[token] == null){
        //    return callback('player is not inside', null);
        //}
        if(scene.status != 'dealer_turn'){
            return callback('game is not dealer turn yet', null);
        }
        game.dealNextCard(deck, function(err, newDeck, card){
            callback(err, newDeck, card);
        });
    } catch(err){
        callback(err, null);
    }
}

module.exports = new SceneService();