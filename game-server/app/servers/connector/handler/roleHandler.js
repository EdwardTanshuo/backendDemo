var Code = require('../../../../../shared/code');
var logger = require('pomelo-logger').getLogger(__filename);
var async = require('async');
var roleService = require('../../../services/role');
var RoleAction = require('../../../actions/role');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

	if(!this.app)
		logger.error(app);
};

/**
 * client place bet
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.bet = function(msg, session, next) {
	var roleAction = new RoleAction(session);
    roleAction.bet(function(err, value){
        if(!!err){
            return next(new Error(err), {code: Code.FAIL, error: err});
        }
        //else{
        //    var remain = 0;
        //    if(!newDeck){
        //        remain = 0;
        //    } else{
        //        remain = newDeck.length;
        //    }
        //    return next(null, {code: Code.OK, result: {card: card, value: value, remain: remain}});
        //}
    });
}

/**
 * client leave game
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.leave = function(msg, session, next) {
    //清除玩家端缓存
    var find_result = roleDeckCollection.findOne({'token': session.get('token')});
    roleDeckCollection.remove(find_result);
    //清除scene缓存
	var roleAction = new RoleAction(session);
    roleAction.leave(app.get('serverId'), function(err, player_platfrom, player_value, player_bet, player){
        if(!!err){
            return next(new Error(err), {code: Code.FAIL, error: err});
        }
        else{
            return next(null, {
                code: Code.OK,
                result: {
                    player_platfrom: player_platfrom,
                    player_value: player_value,
                    player_bet: player_bet,
                    player: player
                }
            });
        }
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
	var roleAction = new RoleAction(session);
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
	var roleAction = new RoleAction(session);
	roleAction.draw(session.get('room'), function(err, newDeck, card, value){
		if(!!err){
			return next(new Error(err), {code: Code.FAIL, error: err});
		}
		else{
			var remain = 0;
			if(!newDeck){
				remain = 0;
			} else{
				remain = newDeck.length;
			}
			return next(null, {code: Code.OK, result: {card: card, value: value, remain: remain}});
		}
	});
}