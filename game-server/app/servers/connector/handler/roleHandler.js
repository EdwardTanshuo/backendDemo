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

Handler.prototype.bet = function(msg, session, next) {
	var roleAction = new RoleAction(session);
}

Handler.prototype.leave = function(msg, session, next) {
	var roleAction = new RoleAction(session);
}

Handler.prototype.finish = function(msg, session, next) {
	var roleAction = new RoleAction(session);
}

Handler.prototype.draw = function(msg, session, next) {
	var roleAction = new RoleAction(session);
	roleAction.draw(session.room, function(err, new_deck, result){
		if(!!err){
			return next(new Error(err), {code: Code.FAIL, error: err});
		}
		else{
			return next(null, {code: Code.OK, new_deck: new_deck, result: result});
		}
	});
}