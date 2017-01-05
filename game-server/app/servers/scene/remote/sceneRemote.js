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

                var tempScene = {};
                tempScene.player = scene.players[role.token];
                tempScene.player_platfrom = scene.player_platfroms[role.token];
                tempScene.player_value = scene.player_values[role.token];
                tempScene.player_bet = scene.player_bets[role.token];
                tempScene.dealer_platfrom = scene.dealer_platfrom;
                tempScene.dealer_value = scene.dealer_value;
                tempScene.status = scene.status;

                return utils.invokeCallback(callback, null, tempScene);
            }
            return utils.invokeCallback(callback, err, tempScene);
        });
    } catch(err){
        return utils.invokeCallback(callback, 'playerEnter: can not add player');
    }
}

exp.playerLeave = function(roomId, role, callback){
    console.log('----' + role.name + 'leave game' + '---------');
    try{
        sceneService.removePlayer(roomId, role, function(err, player_platfrom, player_value, player_bet, player){
            return utils.invokeCallback(callback, err, {
                    player_platfrom: player_platfrom,
                    player_value: player_value,
                    player_bet: player_bet,
                    player: player
                });
        });
        callback(null);
    } catch(err){
        return callback(err);
    }
}

exp.playerBet = function(roomId, role, bet, callback){
    if(roomId == null || role == null || bet == null){
        return utils.invokeCallback(callback, 'playerBet: missing params');
    }
    sceneService.playerBet(roomId, role, bet, function(err, transaction, bet){
        return utils.invokeCallback(callback, err, { transaction: transaction, bet: bet });
    });
}

exp.playerFinish = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

exp.playerDraw = function(args, callback){
    if(args.roomId == null || args.deck == null || args.token == null){
        return utils.invokeCallback(callback, 'playerDraw: missing params');
    }
	sceneService.playerDraw(args.roomId, args.token, args.deck, function(err, newDeck, card, value){
		return utils.invokeCallback(callback, err, {newDeck: newDeck, card: card, value: value});
	});
	
}

exp.getNumberOfPlayers = function(args, callback){
	var num = sceneService.getNumberOfPlayers(args.room_id);
	utils.invokeCallback(callback, null, num);
}
