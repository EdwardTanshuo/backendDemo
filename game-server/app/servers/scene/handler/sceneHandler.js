var Code = require('../../../../../shared/code');
var sceneService = require('../../../services/scene');
var utils = require('../../../util/utils');
var router = require('../../../util/routeUtil');
var sceneConfig = require('../../../../config/scene');
var logger = require('pomelo-logger').getLogger(__filename);
var channelService = app.get('channelService');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

    this.errResult = function(errMsg, next){
        next(new Error(errMsg), {code: Code.FAIL, error: errMsg});
    };

	if(!this.app)
		logger.error(app);
};

/**
 * 创建游戏接口 scene.sceneHandler.createGame
 *
 * 接收参数: 无
 * 返回结果: {Object} scene
 * 功能说明: 通过roomId查找scene；scene已存在，直接返回scene；scene不存在, 创建一个新的scene保存并返回scene；
 */
Handler.prototype.createGame = function(msg, session, next) {
    console.log('----createGame---------')
    var broadcaster = session.get('currentBroadcaster');
	if(broadcaster == null){
		return next(new Error('need entry'), {code: Code.FAIL, error: 'need entry'});
	}
    sceneService.createGame(broadcaster, session.get('room'), function(err, scene){
        if(scene){
            next(null, {code: Code.OK, result: scene});
        } else{
            next(new Error(err), {code: Code.FAIL, error: err});
        }
    });
};

/**
 * 开始游戏接口 scene.sceneHandler.startGame
 *
 * 接收参数： 无
 * 返回结果： {Object} scene
 * 功能说明： 通过roomId找到并更新scene状态，然后通过 GameStartEvent 把 scene对象 推送给当前 channel 的所有玩家
 */
Handler.prototype.startGame = function(msg, session, next) {
    console.log('----startGame---------')

    var roomId = session.get('room');
    //移入 scene service
    /*
    var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return next(new Error('no channel'), {code: Code.FAIL, error: err});
    }
    if (channel.getUserAmount() < sceneConfig.minPlayerCount) {
        return next(new Error('no enough player'), {code: Code.FAIL, error: err});
    }
    */
    sceneService.startGame(roomId, function(err, scene){
        if(err){
            return next(new Error(err), {code: Code.FAIL, error: err});
        }
        //移入 scene service
        //channel.pushMessage({route: 'GameStartEvent', scene: scene});
        next(null, {code: Code.OK, result: scene});
    });
};

/**
 * 结束游戏接口 scene.sceneHandler.endGame
 *
 * 接收参数： 无
 * 返回结果： {Object} scene
 * 功能说明： 通过roomId找到并删除scene，然后通过删除roomId对应的 channel
 */
Handler.prototype.endGame = function(msg, session, next) {
    console.log('----endGame---------')

    sceneService.endGame(session.get('room'), function(err, scene){
        if(err){
            return next(new Error(err), {code: Code.FAIL, error: err});
        }
        channelService.destroyChannel(session.get('room'));
        return next(null, {code: Code.OK, result: scene});
    });
};


/**
 * 主播抽卡接口 scene.sceneHandler.dealerDrawCard
 *
 * 接收参数： 无
 * 返回结果： {Object} new_deck
 *          {Object} result
 * 功能说明：
 */
Handler.prototype.dealerDrawCard = function(msg, session, next) {
    var roomId = this.session.get('room');

    //移入sceneService
    /*var dealerDeckCache = dealerDeckCollection.findOne({roomId: roomId});
    if(!result){
        //errMessage = 'dealerDrawCard: can not find deck';
        return this.errResult('dealerDrawCard: can not find deck', next)
    }
    oldDeck = dealerDeckCache.deck;
    if(!oldDeck){
        //errMessage = 'dealerDrawCard: crash when query memdb';
        //return next(new Error(errMessage), {code: Code.FAIL, error: errMessage});
        return this.errResult('dealerDrawCard: crash when query memdb', next)
    }*/
    sceneService.dealerDrawCard(roomId, oldDeck, function(err, newDeck, newCard){
        if(err){
            //return next(new Error(err), {code: Code.FAIL, error: err});
            return this.errResult(err, next)
        }
        if(!newDeck){
            //errMessage = ;
            //return next(new Error(errMessage), {code: Code.FAIL, error: errMessage});
            return this.errResult('dealerDrawCard: deck is null', next)
        }

        //移入sceneService
        /*oldDeck.deck = newDeck;
        dealerDeckCache.update(oldDeck);*/

        next(null, {code: Code.OK, new_deck: newDeck, result: newCard});
    });
};


