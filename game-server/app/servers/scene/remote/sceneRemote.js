var sceneService = require('../../../services/scene');
var exp = module.exports;
var utils = require('../../../util/utils');

var logger = require('pomelo-logger').getLogger(__filename);

exp.playerLeave = function(data, callback){
	callback();
}

exp.playerEnter = function(data, callback){
        callback();
}

exp.broadcasterLeave = function(data, callback){
        callback();
}

exp.broadcasterEnter = function(data, callback){
        callback();
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