var sceneService = require('../../../services/scene');
var exp = module.exports;
var utils = require('../../../util/utils');
var router = require('../../../util/routeUtil');
var channelService = app.get('channelService');
var logger = require('pomelo-logger').getLogger(__filename);


//视频流停止后中断游戏
exp.streamEnd = function(roomId, callback){
    console.log('---- stream stop, end game ---------');
    sceneService.endGame(roomId, function(err, result){
        return callback(err, result);
    });
}

//主播进入游戏，推送 DealerEnterEvent 消息给当前room的所有人，消息内容为主播的模型
// 然后把主播的roomId加入该room的channel
exp.dealerEnter = function(roomId, dealer, serverId, callback){
    var channel = channelService.getChannel(roomId, true);
    if(!channel) {
        return callback({code: 500, msg: 'dealerEnter: no channel' });
    }
    channel.add(roomId, serverId);
    channel.pushMessage({ route: 'DealerEnterEvent', dealer: dealer });
    callback(null, dealer);
}

//主播离开游戏， 从channel中去掉主播信息， 推送 DealerLeaveEvent 给当前room内的全部人员
exp.dealerLeave = function(roomId, dealer, serverId, callback){
    var channel = channelService.getChannel(roomId, false);
    if(!channel) {
        return callback({code: 500, msg: 'dealerLeave: no channel' });
    }
    channel.pushMessage({route: 'DealerLeaveEvent', dealer: dealer});
    channel.leave(roomId, serverId);
    callback(null);
}

//玩家进入游戏，查找并变更scene对象，channel中增加该玩家，推送 PlayerEnterEvent 消息给当前room内的全部人员
exp.playerEnter = function(roomId, role, serverId, callback){
    console.log('----' + role.name + 'enter game' + '---------');
    sceneService.addPlayer(roomId, role, serverId, function(err, scene, newRole){
        if(scene != null){
            //加入广播组
            var channel = channelService.getChannel(roomId, false);
            if(!channel) {
                return callback({code: 500, msg: 'addPlayer: no channel' });
            }
            channel.add(role.token, serverId);

            //生成返回数据
            var tempScene = {};
            delete newRole['player_platfrom'];
            delete newRole['player_value'];
            delete newRole['player_bet'];
            tempScene.player = newRole;
            tempScene.player_platfrom = newRole.player_platfrom;
            tempScene.player_value = newRole.player_value;
            tempScene.player_bet = newRole.player_bet;
            tempScene.dealer_platfrom = scene.dealer_platfrom;
            tempScene.dealer_value = scene.dealer_value;
            tempScene.durationDealerTurn = scene.durationDealerTurn;
            tempScene.durationPlayerTurn = scene.durationPlayerTurn;
            tempScene.durationBet = scene.durationBet;
            tempScene.status = scene.status;
            tempScene.dealer = scene.dealer;

            var remain = 0;
            if(scene.status === 'betting'){
                remain = scene.durationBet / 1000 - scene.timeElapse;
            } else if(scene.status === 'player_started'){
                remain = scene.durationPlayerTurn / 1000 - scene.timeElapse;
            } else if(scene.status === 'dealer_turn'){
                remain = scene.durationDealerTurn / 1000 - scene.timeElapse;
            }

            tempScene.timeRemain = remain;
            // todo: 玩家加入游戏返回内容，待确定，直接返回scene不合理
            return callback(null, tempScene);
        }
        return callback(err);
    });
}

//玩家退出游戏， 清理除了排行版外所有相关数据
exp.playerLeave = function(roomId, role, serverId, callback){
    console.log('----' + role.name + 'leave game' + '---------');
    sceneService.removePlayer(roomId, role, serverId, function(err, result){
        return callback(err, result);
    });
}

//玩家断开连接
exp.playerDisconnect = function(roomId, role, serverId, callback){
    console.log('----' + role.name + 'disconnected' + '---------');
    //并推送PlayerLeaveEvent消息
    var channel = channelService.getChannel(roomId, false);
    if(!channel) {
        return callback({code: 500, msg: 'dealerEnter: no channel' });
    }
    //channel.pushMessage({route: 'PlayerLeaveEvent', role: role});
    //从channel中去除 player sc
    channel.leave(role.token, serverId);
    return callback();
}

//玩家下注 生成transaction， 推送PlayerBetEvent给所有人，玩家下注后，会被加入游戏的广播组，而被作为游戏玩家
exp.playerBet = function(roomId, role, bet, deck, callback){
    if(roomId == null || role == null || bet == null){
        return callback({ code: 500, result: 'playerBet: missing params' });
    }
    sceneService.playerBet(roomId, role, bet, deck, function(err, result){
        return callback(err, result);
    });
}

//玩家结束自己回合， 当前无用
exp.playerFinish = function(args, callback){
	utils.invokeCallback(callback, null, {});
}

//玩家抽卡， 返回新的卡组以及卡片object
exp.playerDraw = function(roomId, token, deck, callback){
    if(roomId == null || deck == null || token == null){
        return callback({ code: 500, result: 'playerDraw: missing params' });
    }
	sceneService.playerDraw(roomId, token, deck, function(err, result){
		return callback(err, result);
	});
}

//获取直播间人数
exp.getNumberOfPlayers = function(args, callback){
	var num = sceneService.getNumberOfPlayers(args.room_id);
	utils.invokeCallback(callback, null, num);
}

//送礼成功后广播
exp.sendDanmu = function(roomId, msg, callback) {
    sceneService.sendDanmu(roomId, msg, function(err){
        if(err){
            return callback(err);
        }
        return callback();
    });
}

exp.sendGift = function(roomId, gift, role, callback) {
    sceneService.sendGift(roomId, gift, role, callback);
}

exp.getNum = function(roomId, callback) {
    var num = sceneService.getNumberOfPlayers(roomId);
    return callback({viewerCount: num});
}
