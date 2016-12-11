var sceneService = require('../../../services/scene');
var exp = module.exports;
var utils = require('../../../util/utils');
var router = require('../../../util/routeUtil');
var channelService = app.get('channelService');
var logger = require('pomelo-logger').getLogger(__filename);

exp.playerLeave = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

exp.playerBet = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

exp.playerFinish = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

exp.playerDraw = function(args, callback){
	sceneService.playerDraw(args.roomid, args.token, args.deck, function(err, new_deck, result){
		utils.invokeCallback(callback, err, {new_deck: new_deck, result: result});
	});
	
}

exp.playerEnter = function(args, callback){
	sceneService.addPlayer(args.roomid, args.role, args.serverId, function(err, scene){
		if(scene != null){
			console.log(JSON.stringify(scene));

			scene.player = scene.players[args.role.token];
			scene.player_platfrom = scene.player_platfroms[args.role.token];
			scene.player_value = scene.player_values[args.role.token];
			scene.player_bet = scene.player_bets[args.role.token];
			
			//清理冗余信息
			delete scene.players;
			delete scene.player_platfroms;
			delete scene.player_values;
			delete scene.player_bets;
		}
		utils.invokeCallback(callback, err, scene);
	});
}

exp.broadcasterLeave = function(args, callback){
    sceneService.dealerLeave(args.broadcaster, args.roomid, args.serverId);
}

exp.broadcasterEnter = function(args, callback){
    utils.invokeCallback(callback, null, {});
}

exp.getNumberOfPlayers = function(args, callback){
	var num = sceneService.getNumberOfPlayers(args.room_id);
	utils.invokeCallback(callback, null, num);
}

exp.startGame = function(args, callback){
	sceneService.startGame(args.roomId, args.serverId, function(err, result){
		utils.invokeCallback(callback, err, result);
	});	
  
}
exp.createGame = function(args, callback){
	sceneService.createGame(args.broadcaster, args.roomId, args.serverId, function(err, result){
        utils.invokeCallback(callback, err, result);
	});
} 