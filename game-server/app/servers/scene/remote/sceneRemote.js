var sceneService = require('../../../services/scene');
var exp = module.exports;
var utils = require('../../../util/utils');
var router = require('../../../util/routeUtil');

var logger = require('pomelo-logger').getLogger(__filename);

exp.playerLeave = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

exp.playerEnter = function(args, callback){
	sceneService.addPlayer(args.roomid, args.role, function(err, scene){
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
	}, router.channel(args.roomid));	
}

exp.broadcasterLeave = function(args, callback){
    utils.invokeCallback(callback, null, {});
}

exp.broadcasterEnter = function(args, callback){
    utils.invokeCallback(callback, null, {});
}

exp.getNumberOfPlayers = function(args, callback){
	var num = sceneService.getNumberOfPlayers(args.room_id);
	utils.invokeCallback(callback, null, num);
}

exp.startGame = function(args, callback){
	sceneService.startGame(args.room_id, function(err, result){
		utils.invokeCallback(callback, err, result);
	});	
  
}

exp.createGame = function(args, callback){
	sceneService.createGame(args.broadcaster, args.room_id, function(err, result){
		utils.invokeCallback(callback, err, result);
	});	
} 