var logger = require('pomelo-logger').getLogger(__filename);
var async = require('async');

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
 * 接收参数: { bet: xx  }  玩家下注金额
 * 返回结果:  code: 200 //正常
 *                 3001 // 玩家财富值不够
 *                 3002 // 主播财富值不够
 *            {
 *              isBet: isBet,  //是否下注 true | false
 *              quantity: quantity,   //下注金额
 *              defaultCards: [card1,card2],   //卡组信息
 *              value: {value: 18, busted: false, numberOfHigh: 35 numberOfTrans: 0}  // 玩家当前卡点数
 *           }
 * 功能说明: 玩家下注接口
 */
Handler.prototype.bet = function(msg, session, next) {

    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        token = session.get('token');

    // 没有赌注
    if(msg.bet == null ){
        return next(null, {code: Code.PLAYER.NO_BET, result: 'playerBet: no bet'});
    }

    // 用户财富值是否足够
    if(currentRole.wealth < msg.bet){
        return next(null, {code: Code.PLAYER.NO_WEALTH, result: 'playerBet: player no enough wealth'});
    }

    try{
        var result = roleDeckCollection.findOne({token: token});
        if(!result){
            return next(null, {code: Code.PLAYER.NO_DECK, result: 'playerBet: can not find deck'});
        }
        var deck = result.deck;
        if(!deck){
            return next(null, {code: Code.PLAYER.NO_DECK, result: 'playerBet: crash when query memdb'});
        }
        app.rpc.scene.sceneRemote.playerBet(session, roomId, currentRole, msg.bet, deck, function(err, result){
            if(err){
                return next(null, { code: err.code, result: err.msg });
            }
            return next(null, { code: Code.OK, result: result });
        });
    } catch(err){
        return next(new Error(err), {code: Code.FAIL, result: err});
    }
}


/**
 * 玩家退出游戏接口 connector.roleHandler.leave
 *
 * 接收参数: 无
 * 返回结果: { code : 200
 *             result: 'cleared'
             }
 * 功能说明: 玩家主动退出游戏
 */
Handler.prototype.leave = function(msg, session, next) {
    var currentRole = session.get('currentRole'),
        roomId = session.get('room'),
        token = session.get('token');

    try{
        //清除玩家端缓存
        var find_result = roleDeckCollection.findOne({'token': token});
        roleDeckCollection.remove(find_result);
        //清除scene缓存
        app.rpc.scene.sceneRemote.playerLeave(session, roomId, currentRole, function(err, result){
            if(err){
                return next(null, { code: err.code, result: err.msg });
            }
            return next(null, { code: Code.OK, result: result });
        });
    } catch(err){
        return next(new Error(err), {code: Code.FAIL, result: err});
    }

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
        return next(null, {code: Code.PLAYER.NO_DECK, result: 'playerDraw: can not find roleDeck'});
    }
    var deck = roleDeck.deck;
    if(!deck){
        return next(null, {code: Code.PLAYER.NO_DECK, result: 'playerDraw: can not find Deck'});
    }

    app.rpc.scene.sceneRemote.playerDraw(session, roomId, token, deck, function(err, result){
        if(err){
            return next(null, { code: err.code, result: err.msg });
        }else{
            if(!result.newDeck){
                return next(null, { code: Code.PLAYER.NO_DECK, result: 'playerDraw: deck is null' });
            }
            roleDeck.deck = result.newDeck;
            roleDeckCollection.update(roleDeck);
            var remain = roleDeck.deck.length;

            return next(null, {code: Code.OK, result: {card: result.card, value: result.value, remain: remain}});
        }
    });

}