var Code = require('../../../../../shared/code');
var dispatcher = require('../../../util/dispatcher');

/**
 * Gate handler that dispatch user to connectors.
 */
module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

Handler.prototype.queryEntry = function(msg, session, next) {
	var token = msg.token;
	if(!token) {
		next(null, {code: Code.FAIL, error: 'Missing token'});
		return;
	}

	var connectors = this.app.getServersByType('connector');
	if(!connectors || connectors.length === 0) {
		next(null, {code: Code.GATE.FA_NO_SERVER_AVAILABLE});
		return;
	}

	var res = dispatcher.dispatch(token, connectors);
	next(null, {code: Code.OK, host: res.host, port: res.clientPort});
  // next(null, {code: Code.OK, host: res.pubHost, port: res.clientPort});
};

Handler.prototype.queryBroadcaster = function(msg, session, next) {
	var room = msg.room;
	if(!room) {
		next(null, {code: Code.FAIL, error: 'Missing room'});
		return;
	}

	var broadcasters = this.app.getServersByType('broadcaster');
	if(!broadcasters || broadcasters.length === 0) {
		next(null, {code: Code.GATE.FA_NO_SERVER_AVAILABLE});
		return;
	}

	var res = dispatcher.dispatch(room, broadcasters);
	next(null, {code: Code.OK, host: res.host, port: res.clientPort});
  // next(null, {code: Code.OK, host: res.pubHost, port: res.clientPort});
};
