var Code = require('../../../../../shared/code');
var logger = require('pomelo-logger').getLogger(__filename);
var async = require('async');
var broadcasterAction = require('../../../actions/broadcaster');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

	if(!this.app)
		logger.error(app);
};

Handler.prototype.createGame = function(msg, session, next) {
	if(msg.room_id == null){
		
	}
	
	broadcasterAction.createGame();
}