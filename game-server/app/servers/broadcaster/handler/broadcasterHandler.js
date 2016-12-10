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


Handler.prototype.start = function(msg, session, next) {
    var rid = session.get('rid');
    var username = session.uid.split('*')[0];
    var channelService = this.app.get('channelService');
    var param = {
        msg: msg.content,
        from: username,
        target: msg.target
    };
    channel = channelService.getChannel(rid, false);

    //the target is all users
    if(msg.target == '*') {
        channel.pushMessage('onChat', param);
    }
    //the target is specific user
    else {
        var tuid = msg.target + '*' + rid;
        var tsid = channel.getMember(tuid)['sid'];
        channelService.pushMessageByUids('onChat', param, [{
            uid: tuid,
            sid: tsid
        }]);
    }
    next(null, {
        route: msg.route
    });
};

