var broadcasterService = require('../../../services/broadcaster');
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
	  broadcasterService.auth(msg.room, function(err, result){
	  		if(err){
	  			return next(new Error(err), {code: Code.FAIL, error: err});
	  		}
	  		else{
	  			self_app.get('sessionService').kick(msg.room, function(err){
	  				if(err){
	  					return next(new Error(err), {code: Code.FAIL, error: err});
	  				}
	  				else{
	  					session.bind(msg.room, function(err){
			  				if(!err){
			  					session.set('room', msg.room);
								session.set('currentBroadcaster', result);
								session.pushAll(function(err){
									broadcasterEnter(self_app, session, function(err, result){
					  				if(err){
						  					return next(new Error(err), {code: Code.FAIL, error: err});
						  				}
						  				else{
						  					session.on('closed', onBroadcasterLeave.bind(null, self_app, session, 'connection closed'));
						  					return next(null, {code: Code.OK, result: session.get('currentBroadcaster')});
						  				}
						  			});
								});
			  				}
			  				else{
			  					return next(new Error(err), {code: Code.FAIL, error: err});
			  				}
			  			});
	  				}
	  			});
	  		}
	  });
};

var onBroadcasterLeave = function (app, session, reason) {
	app.rpc.scene.sceneRemote.broadcasterLeave(session, {token: session.token}, function(err){
		if(!!err){
			logger.error('player leave error! %j', err);
		}
	});
};

var broadcasterEnter = function (app, session, callback) {
	app.rpc.scene.sceneRemote.broadcasterEnter(session, {room: session.room}, callback);
	callback(null);
};
