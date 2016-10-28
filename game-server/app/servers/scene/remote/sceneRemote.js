var sceneService = require('../../../services/scene');
var exp = module.exports;

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