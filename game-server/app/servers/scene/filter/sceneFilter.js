var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');

module.exports = function() {
	return new Filter();
};

var Filter = function() {
};

/**
 * scene filter
 *  验证是否为主播
 */
Filter.prototype.before = function(msg, session, next){
    if (session.uid !== session.get('room')) {
        return next('No permissions', null);
    }
    next();
};