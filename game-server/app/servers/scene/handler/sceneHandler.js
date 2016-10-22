var Code = require('../../../../../shared/code');

/**
 * Gate handler that dispatch user to connectors.
 */
module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};


