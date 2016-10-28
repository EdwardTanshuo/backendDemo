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
	  var self_app = this.app;
	  roleService.auth(msg.token, function(err, result){
	  		if(err){
	  			return next(new Error(err), {code: Code.FAIL, error: err});
	  		}
	  		else{
	  			self_app.get('sessionService').kick(msg.token, function(err){
	  				if(err){
	  					return next(new Error(err));
	  				}
	  				else{
	  					session.bind(msg.token, function(err){
			  				if(!err){
			  					session.set('token', msg.token);
								session.set('currentRole', result);
								session.pushAll(function(err){
									roleEnter(self_app, session.currentRole, function(err, result){
					  				if(err){
						  					return next(new Error(err));
						  				}
						  				else{
						  					session.on('closed', onRoleLeave.bind(null, self_app, session, 'connection closed'));
						  					return next(null, {code: Code.OK, result: session.get('currentRole')});
						  				}
						  			});
								});
			  				}
			  				else{
			  					return next(new Error(err));
			  				}
			  			});
	  				}
	  			});
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

var roleEnter = function (app, role, callback) {
	app.rpc.scene.sceneRemote.playerEnter(session, {token: session.token}, callback);
	callback(null);
};
