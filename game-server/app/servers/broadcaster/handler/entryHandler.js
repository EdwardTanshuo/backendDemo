var broadcasterService = require('../../../services/broadcaster');
var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

/**
 * 主播端 entry.
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
            //return next(null, {code: Code.ENTRY.BROADCASTER_AUTH_FAIL, error: err});
            console.error(err);
        } else{
            self_app.get('sessionService').kick(msg.roomId, function(err){
                if(err){
                    return next(new Error(err), {code: Code.FAIL, error: err});
                } else{
                    session.bind(msg.roomId, function(bindErr){
                        if(!bindErr){
                            console.log('-------currentBroadcaster Entry------------------------------')
                            console.log(result);
                            session.set('room', msg.roomId);
                            session.set('currentBroadcaster', result);
                            session.pushAll(function(pushErr){
                                if(pushErr) {
                                    console.error('set Broadcaster for session service failed! error is: %j', pushErr.stack);
                                    return next(new Error(pushErr), {code: Code.FAIL, error: pushErr});
                                }
                                session.on('closed', onBroadcasterLeave.bind(null, self_app));
                                onBroadcasterEnter(self_app, session, next);
                            });
                        } else{
                            return next(new Error(bindErr), {code: Code.FAIL, error: bindErr});
                        }
                    });
                }
            });
        }
    });
};

var onBroadcasterLeave = function (app, session) {
    console.log('------onBroadcasterLeave----------');

    if(!session || !session.uid) {
        console.error('Broadcaster leave error! %j', 'no session');
    }
    var roomId = session.get('room'),
        broadcaster= session.get('currentBroadcaster'),
        serverId= app.get('serverId');
	app.rpc.scene.sceneRemote.dealerLeave(session, roomId, broadcaster, serverId, function(err){
		if(!!err){
			console.error('Broadcaster leave error! %j', err);
            //next(new Error(err), {code: err.code, error: err.msg});
		} else{
            console.log('broadcaster: ' + roomId + ' leave!!');
        }
	});
};

var onBroadcasterEnter = function (app, session, next) {
    console.log('------onBroadcasterEnter----------');

    var roomId = session.get('room'),
        broadcaster = session.get('currentBroadcaster'),
        serverId = app.get('serverId');

    app.rpc.scene.sceneRemote.dealerEnter(session, roomId, broadcaster, serverId, function(err, dealer){
        if(err){
            next(new Error(err.msg), {code: err.code, error: err.msg});
        } else{
            next(null, {code: Code.OK, result: dealer});
        }
    });
};
