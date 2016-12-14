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
	var roleAction = new RoleAction(session);
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
			return next(null, {code: Code.OK, result: {card: card, value: value}});
		}
	});
}