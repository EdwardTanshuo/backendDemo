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
	  broadcasterService.auth(msg.roomId, function(err, result){
	  		if(err){
	  			return next(new Error(err), {code: Code.FAIL, error: err});
	  		}
	  		else{
	  			self_app.get('sessionService').kick(msg.roomId, function(err){
	  				if(err){
	  					return next(new Error(err), {code: Code.FAIL, error: err});
	  				} else{
	  					session.bind(msg.roomId, function(bindErr){
			  				if(!bindErr){
			  					session.set('room', msg.roomId);
								session.set('currentBroadcaster', result);
								session.pushAll(function(pushErr){
                                    if(pushErr) {
                                        logger.error('set Broadcaster for session service failed! error is: %j', pushErr.stack);
                                    }
                                    session.on('closed', onBroadcasterLeave.bind(null, self_app, 'connection closed'));
                                    onBroadcasterEnter(self_app, session, next);
								});
			  				} else{
                                next(new Error(bindErr), {code: Code.FAIL, error: bindErr});
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

var onBroadcasterEnter = function (app, session, next) {
    console.log('---onBroadcasterEnter-------');
    var serverId = app.get('serverId');
	app.rpc.scene.sceneRemote.createGame(session, {
        roomId: session.get('room'),
        broadcaster: session.get('currentBroadcaster'),
        serverId: serverId
    }, function(err, scene){
        if(scene){
            next(null, {code: Code.OK, result: scene});
        } else{
            next(new Error(err), {code: Code.FAIL, error: err});
        }
    });
};
