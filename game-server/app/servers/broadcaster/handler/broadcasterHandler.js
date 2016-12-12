var Code = require('../../../../../shared/code');
var logger = require('pomelo-logger').getLogger(__filename);
var async = require('async');
var BroadcasterAction = require('../../../actions/broadcaster');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

	if(!this.app)
		logger.error(app);
};

// TODO：已经废弃
Handler.prototype.createGame = function(msg, session, next) {
	if(msg.room == null){
		return next(new Error('missing room'), {code: Code.FAIL, error: 'missing room'});
	}

	if(session.get('currentBroadcaster') == null){
		return next(new Error('need entry'), {code: Code.FAIL, error: 'need entry'});
	}

	var broadcasterAction = new BroadcasterAction(session)
	
	broadcasterAction.createGame(msg.room, function(err, result){
		if(err){
			return next(new Error(err), {code: Code.FAIL, error: err});
		}
		else{
			return next(null, {code: Code.OK, result: result});
		}
	});
}

Handler.prototype.startGame = function(msg, session, next) {
    console.log('----startGame---------')
    app.rpc.scene.sceneRemote.startGame(session, { roomId: session.get('room') }, function(err, scene){
        if(err){
            next(new Error(err), {code: Code.FAIL, error: err});
        } else{
            next(null, {code: Code.OK, result: scene});
        }
    });
};

Handler.prototype.endGame = function(msg, session, next) {
    console.log('----endGame---------')
    app.rpc.scene.sceneRemote.endGame(session, { roomId: session.get('room') }, function(err, scene){
        if(err){
            next(new Error(err), {code: Code.FAIL, error: err});
        } else{
            next(null, {code: Code.OK, result: scene});
        }
    });
};

