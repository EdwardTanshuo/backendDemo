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
 * 游戏通知下注接口 scene.sceneHandler.createGame
 *
 * 接收参数: 无
 * 返回结果: {Object} scene
 * 功能说明: 通知用户开始下注；
 */
Handler.prototype.startBet = function(msg, session, next) {
    console.log('----startBet---------')
    var broadcaster = session.get('currentBroadcaster');
    if(broadcaster == null){
        return next(new Error('need entry'), {code: Code.FAIL, error: 'need entry'});
    }
    sceneService.startBet(broadcaster, session.get('room'), function(err, scene){
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

    sceneService.startGame(session.get('room'), function(err, scene){
        if(err){
            return next(new Error(err), {code: Code.FAIL, error: err});
        }
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
    sceneService.dealerDrawCard(this.session.get('room'), function(err, newDeck, newCard, newValue){
        if(err){
            return this.errResult(err, next)
        }
        if(!newDeck){
            return this.errResult('dealerDrawCard: deck is null', next)
        }
        next(null, {code: Code.OK,  result: { newDeck: newDeck, newValue: newValue }});
    });
};

/**
 * 主播抽卡结束接口 scene.sceneHandler.dealerFinish
 *
 * 接收参数： 无
 * 返回结果： {Object} scene
 *
 * 功能说明：
 */
Handler.prototype.dealerFinish = function(msg, session, next) {
    sceneService.dealerFinish(this.session.get('room'), function(err, scene){
        if(err){
            return this.errResult(err, next)
        }
        next(null, {code: Code.OK, result: scene});
    });
};




