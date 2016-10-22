var Code = require('../../../../../shared/code');
var roleService = require('../../../service/dataSync');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

Handler.prototype.saveRole = function(msg, session, next) {
	next(null, {code: Code.FAIL});
	return;
};