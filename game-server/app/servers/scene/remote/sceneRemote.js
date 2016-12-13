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
            return callback('no channel', null);
        }
        channel.add(roomId, serverId);
        channel.pushMessage({ route: 'DealerEnterEvent', dealer: dealer });
        callback(null, dealer);
    } catch(err){
        return callback(err, null);
    }
}

//主播离开游戏， 从channel中去掉主播信息， 推送 DealerLeaverEvent 给当前room内的全部人员
exp.dealerLeave = function(roomId, dealer, serverId, callback){
    try{

    var channel = channelService.getChannel(roomId, true);
        if(!channel) {
            return callback('no channel', null);
        }
        channel.leave(roomId, serverId);
        channel.pushMessage({route: 'DealerLeaverEvent', dealer: dealer});
        callback(null);
    } catch(err){
        return callback(err);
    }
}

//玩家进入游戏，查找并变更scene对象，channel中增加该玩家，推送 PlayerEnterEvent 消息给当前room内的全部人员
exp.playerEnter = function(roomId, role, serverId, callback){
    console.log('----' + role.name + 'enter game' + '---------');
    try{
        sceneService.addPlayer(roomId, role, serverId, function(err, scene){
            if(scene != null){
                console.log(JSON.stringify(scene));

                scene.player = scene.players[role.token];
                scene.player_platfrom = scene.player_platfroms[role.token];
                scene.player_value = scene.player_values[role.token];
                scene.player_bet = scene.player_bets[role.token];

                //清理冗余信息
                delete scene.players;
                delete scene.player_platfroms;
                delete scene.player_values;
                delete scene.player_bets;

                var channel = channelService.getChannel(roomId, false);
                if(!channel) {
                    return callback('no channel', null);
                }
                channel.pushMessage({route: 'PlayerEnterEvent', role: role});
                channel.add(role.token, serverId);
                return utils.invokeCallback(callback, null, scene);
            }
            return utils.invokeCallback(callback, err, scene);
        });
    } catch(err){
        return utils.invokeCallback(callback, 'playerEnter: can not add player');
    }
}

exp.playerLeave = function(args, callback){
    console.log('----' + args.role.name + 'leave game' + '---------');
	utils.invokeCallback(callback, null, {});
}

exp.playerBet = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

exp.playerFinish = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

exp.playerDraw = function(args, callback){
    if(args.roomId == null || args.deck == null || args.token == null){
        return utils.invokeCallback(callback, 'err: missing params');
    }
	sceneService.playerDraw(args.roomId, args.token, args.deck, function(err, new_deck, result){
		return utils.invokeCallback(callback, err, {new_deck: new_deck, result: result});
	});
	
}

exp.getNumberOfPlayers = function(args, callback){
	var num = sceneService.getNumberOfPlayers(args.room_id);
	utils.invokeCallback(callback, null, num);
}
