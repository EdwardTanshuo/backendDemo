var roleService = require('../../../services/role');
var Code = require('../../../../../shared/code');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

/**
 * New client entry.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.entry = function(msg, session, next) {
	  roleService.auth(msg.token, function(err, result){
	  		if(err){
	  			return next(new Error(err), {code: Code.FAIL});
	  		}
	  		else{
	  			session.on('closed', onUserLeave.bind(null, self.app, session, 'connection closed'));
	  			session.token = msg.token; 
	  			session.currentRole = result;
	  			next(null, {code: Code.OK, result: result});
	  		}
	  });
};

var onRoleLeave = function (app, session, reason) {

	app.rpc.scene.sceneRemote.playerLeave(session, {token: session.token}, function(err){
		if(!!err){
			logger.error('player leave error! %j', err);
		}
	});
};
