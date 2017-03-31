var sceneService = require('../../../services/scene');
var exp = module.exports;
var utils = require('../../../util/utils');
var router = require('../../../util/routeUtil');
var channelService = app.get('channelService');
var logger = require('pomelo-logger').getLogger(__filename);


//主播进入游戏，推送 DealerEnterEvent 消息给当前room的所有人，消息内容为主播的模型
// 然后把主播的roomId加入该room的channel
exp.dealerEnter = function(roomId, dealer, serverId, callback){
    try{
        var channel = channelService.getChannel(roomId, true);
        if(!channel) {
            return callback({code: Code.COMMAND.NO_CHANNEL, msg: 'dealerEnter: no channel' });
        }
        channel.add(roomId, serverId);
        channel.pushMessage({ route: 'DealerEnterEvent', dealer: dealer });
        callback(null, dealer);
    } catch(err){
        return callback({code: Code.FAIL, msg: 'dealerEnter:  error ' + err });
    }
}

//主播离开游戏， 从channel中去掉主播信息， 推送 DealerLeaverEvent 给当前room内的全部人员
exp.dealerLeave = function(roomId, dealer, serverId, callback){
    try{
        var channel = channelService.getChannel(roomId, true);
        if(!channel) {
            return callback({code: Code.COMMAND.NO_CHANNEL, msg: 'dealerLeave: no channel' });
        }
        channel.leave(roomId, serverId);
        channel.pushMessage({route: 'DealerLeaverEvent', dealer: dealer});
        callback(null);
    } catch(err){
        return callback({code: Code.FAIL, msg: 'dealerLeave:  error ' + err });
    }
}

//玩家进入游戏，查找并变更scene对象，channel中增加该玩家，推送 PlayerEnterEvent 消息给当前room内的全部人员
exp.playerEnter = function(roomId, role, serverId, callback){
    console.log('----' + role.name + 'enter game' + '---------');
    try{
        sceneService.addPlayer(roomId, role, serverId, function(err, scene){
            if(scene != null){
                console.log(JSON.stringify(scene));

                var tempScene = {};
                tempScene.player = scene.players[role.token];
                tempScene.player_platfrom = scene.player_platfroms[role.token];
                tempScene.player_value = scene.player_values[role.token];
                tempScene.player_bet = scene.player_bets[role.token];
                tempScene.dealer_platfrom = scene.dealer_platfrom;
                tempScene.dealer_value = scene.dealer_value;
                tempScene.durationDealerTurn = scene.durationDealerTurn;
                tempScene.durationPlayerTurn = scene.durationPlayerTurn;
                tempScene.durationBet = scene.durationBet;
                tempScene.status = scene.status;
                tempScene.dealer = scene.dealer;
                // todo: 玩家加入游戏返回内容，待确定，直接返回scene不合理
                return callback(null, tempScene);
            }
            return callback(err);
        });
    } catch(err){
        return callback({code: Code.FAIL, msg: 'playerEnter:  error ' + err });
    }
}

exp.playerLeave = function(roomId, role, serverId, callback){
    console.log('----' + role.name + 'leave game' + '---------');
    try{
        sceneService.removePlayer(roomId, role, serverId, function(err, result){
            return callback(err, result);
        });
    } catch(err){
        return callback({code: Code.FAIL, msg: 'playerLeave:  error ' + err });
    }
}

exp.playerBet = function(roomId, role, bet, deck, callback){
    if(roomId == null || role == null || bet == null){
        return callback({ code: Code.COMMON.LESS_PARAM, result: 'playerBet: missing params' });
    }
    sceneService.playerBet(roomId, role, bet, deck, function(err, result){
        return callback(err, result);
    });
}

exp.playerFinish = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

exp.playerDraw = function(roomId, token, deck, callback){
    if(roomId == null || deck == null || token == null){
        return callback({ code: Code.COMMON.LESS_PARAM, result: 'playerDraw: missing params' });
    }
	sceneService.playerDraw(roomId, token, deck, function(err, result){
		return callback( err, result);
	});
}

exp.getNumberOfPlayers = function(args, callback){
	var num = sceneService.getNumberOfPlayers(args.room_id);
	utils.invokeCallback(callback, null, num);
}


exp.sendDanmu = function(roomId, msg, callback) {
    sceneService.sendDanmu(roomId, msg, function(err, scene){
        if(err){
            return callback(err);
        }
        return callback();
    });
}

exp.getNum = function(roomId, callback) {
    var num = sceneService.getNumberOfPlayers(roomId);
    return callback({viewerCount: num});
}
