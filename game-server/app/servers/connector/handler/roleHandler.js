var Code = require('../../../../../shared/code');
var logger = require('pomelo-logger').getLogger(__filename);
var async = require('async');
var utils = require('../../../util/utils');
var roleService = require('../../../services/role');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

	if(!this.app)
		logger.error(app);
};

Handler.prototype.onCreate = function(msg, session, next) {
	
}