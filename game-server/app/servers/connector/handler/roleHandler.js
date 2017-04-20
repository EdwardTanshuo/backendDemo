var logger = require('pomelo-logger').getLogger(__filename);
var async = require('async');
var utils = require('../../../util/utils');
var giftService = require('../../../services/gift');
var dataSyncService = require('../../../services/dataSync');
var roleService = require('../../../services/role');


module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

	if(!this.app)
		logger.error(app);
};

/**
 * 玩家下注接口 connector.roleHandler.bet
 *
 * 接收参数: { bet: 50  }  玩家下注金额，要求：bet > 0
 * 返回结果: // 接口调用成功，
 *          { code: 200 ,
 *            result:  { isBet: isBet,  //是否下注 true | false
 *                       quantity: quantity,   //下注金额
 *                       roleWealth: 350,  // 玩家余额
 *                       dealerWealth: 98234, //  主播余额
 *                       defaultCards: [card1,card2],   //卡组信息
 *                       value: {value: 18, busted: false, numberOfHigh: 35 numberOfTrans: 0}  // 玩家当前卡点数 } }
 *
 *           // 接口调用失败，
 *           {  code: 4002,  // error code
 *              result: 'playerBet: no bet'  //error message }
 * 功能说明: 玩家下注接口
 */
Handler.prototype.bet = function(msg, session, next) {
    var roomId = session.get('room'),
        token = session.get('token'),
        bet = Number(msg.bet);


    //本地创建卡组model
    var deckId = (currentRole.deckId != null) ? currentRole.deckId : 'default';
    var deck = utils.createDeck(deckId);
    if(deck == null){
        console.error('PlayerBet: no such deck');
        return callback('PlayerBet: no such deck');
    }
   
    //新用户的卡组加入用户缓存
    var find_result = roleDeckCollection.findOne({'token': token});
    if(find_result != null){
        find_result.deck = deck;
        roleDeckCollection.update(find_result);
    } else{
        console.error('PlayerBet: miss deck');
        return callback('PlayerBet: miss deck');
    }

    // 没有赌注
    if(bet == null){
        var error = 'playerBet: no bet';
        return next(new Error(error), {code: Code.PLAYER.NO_BET, error: error});
    }

    // 同步当前用户信息
    roleService.auth(roomId, token, function(err, currentRole){
        if(!!err){
            return next(new Error(err), {code: Code.FAIL, error: 'PlayerBet: update CurrentRole error :' + err});
        }

        // 更新session
        session.set('currentRole', currentRole);
        session.pushAll(function(err) {
            if (err) {
                return next(new Error(err), {code: Code.FAIL, error: 'PlayerBet: update CurrentRole error :' + err});
            }
            
            // 用户财富值是否足够
            if(currentRole.wealth < bet){
                var error = 'playerBet: player no enough wealth';
                return next(new Error(error), {code: Code.PLAYER.NO_WEALTH, error: error});
            }

            // 用户卡组
            var result = roleDeckCollection.findOne({token: token});
            if(!result){
                var error = 'playerBet: can not find deck';
                return next(new Error(error), {code: Code.PLAYER.NO_DECK, error: error});
            }
            
            //下注
            app.rpc.scene.sceneRemote.playerBet(session, roomId, currentRole, bet, result.deck, function(err, result){
                if(!!err){
                    return next(new Error(err.msg), { code: err.code, error: err.msg });
                }
                return next(null, { code: Code.OK, result: result });
            }); 
            
        });
    });
}


/**
 * 玩家退出游戏接口 connector.roleHandler.leave
 *
 * 接收参数: 无
 * 返回结果:  // 接口调用成功
 *          {  code : 200
 *             result: 'cleared' }
 *
 *           // 接口调用失败
 *           {  code: code,  // error code
 *              result: 'xxxxx'  //error message }
 * 功能说明: 玩家主动退出游戏
 */
Handler.prototype.leave = function(msg, session, next) {
    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        serverId = this.app.get('serverId'),
        token = session.get('token');

    //清除玩家端缓存
    var find_result = roleDeckCollection.findOne({'token': token});
    roleDeckCollection.remove(find_result);
    //清除scene缓存
    app.rpc.scene.sceneRemote.playerLeave(session, roomId, currentRole, serverId, function(err, result){
        if(err){
            return next(new Error(err.msg), { code: err.code, error: err.msg });
        }
        return next(null, { code: Code.OK, result: result });
    });
}

/**
 * client end current turn
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.finish = function(msg, session, next) {

}

/**
 * client draw card.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.draw = function(msg, session, next) {
    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        token = session.get('token');

    var roleDeck = roleDeckCollection.findOne({token: token});
    if(!roleDeck){
        return next(new Error('playerDraw: can not find roleDeck'), {code: Code.PLAYER.NO_DECK, error: 'playerDraw: can not find roleDeck'});
    }
    var deck = roleDeck.deck;
    if(!deck){
        return next(new Error('playerDraw: can not find Deck'), {code: Code.PLAYER.NO_DECK, error: 'playerDraw: can not find Deck'});
    }

    app.rpc.scene.sceneRemote.playerDraw(session, roomId, token, deck, function(err, result){
        if(err){
            return next(new Error(err.msg), { code: err.code, error: err.msg });
        }else{
            if(!result.newDeck){
                return next(new Error('playerDraw: deck is null'), { code: Code.PLAYER.NO_DECK, error: 'playerDraw: deck is null' });
            }
            roleDeck.deck = result.newDeck;
            roleDeckCollection.update(roleDeck);
            var remain = roleDeck.deck.length;

            return next(null, {code: Code.OK, result: {card: result.card, value: result.value, remain: remain}});
        }
    });

}

/**
 * 玩家发送弹幕接口 connector.roleHandler.sendDanmu
 */
Handler.prototype.sendDanmu = function(msg, session, next) {
    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        token = session.get('token');

    msg.user = currentRole;
    app.rpc.scene.sceneRemote.sendDanmu(session, roomId, msg, function(err){
            if(!!err){
                return next(new Error(err.msg), { code: err.code, error: err.msg });
            }
            return next(null, { code: Code.OK });
    });
}

/**
 * 玩家送礼接口 connector.roleHandler.sendGift
 */
Handler.prototype.sendGift = function(gift, session, next) {
    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        token = session.get('token');

    gift.broadcaster_id = roomId;

    giftService.sendGift(token, gift, (err, body)=>{
        if(err){
            return next(new Error(err), { code: Code.FAIL, error: err });
        } else{
            app.rpc.scene.sceneRemote.sendGift(session, roomId, gift, function(err){
                if(!!err){
                    return next(new Error(err.msg), { code: err.code, error: err.msg });
                }
                return next(null, { code: Code.OK });
            });
        }
    });
}

/**
 * 玩家获取礼品列表 connector.roleHandler.listGift
 */
Handler.prototype.listGift = function(msg, session, next) {
    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        token = session.get('token');

    giftService.listGift(token, (err, body)=>{
        if(!!err){
            return next(new Error(err), { code: Code.FAIL, error: err });
        } else{
            return next(null, { code: Code.OK, result: body });
        }
    });
}

/**
 * 玩家获取观众数量接口 connector.roleHandler.getViewerCount
 */
Handler.prototype.getViewerCount = function(msg, session, next) {
    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        token = session.get('token');

    app.rpc.scene.sceneRemote.getNum(session, roomId, function(result){
        return next(null, { code: Code.OK, result: result });
    });
}

/**
 * 玩家关注主播接口 connector.roleHandler.follow
 */
Handler.prototype.follow = function(msg, session, next) {
    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        token = session.get('token');
    msg.token = token;
    msg.broadcaster_id = roomId;
    dataSyncService.followActivity(msg, function(err){
        if(!!err){
            return next(new Error(err), { code: Code.FAIL, error: err });
        } else{
            return next(null, { code: Code.OK });
        }
    });
}