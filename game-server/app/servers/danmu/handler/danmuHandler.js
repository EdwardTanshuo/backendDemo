var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');
var router = require('../../../util/routeUtil');
var logger = require('pomelo-logger').getLogger(__filename);
var channelService = app.get('channelService');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

	if(!this.app)
		logger.error(app);
};

/**
 *  danmu.danmuHandler.sendMessage
 *
 * 接收参数: {Object} danmu
 * 返回结果: 无
 * 功能说明: 发送弹幕
 */
Handler.prototype.sendMessage = function(msg, session, next) {
    var channel = channelService.getChannel(session.get('room') + '_danmu', true);
    if (!channel) {
        return callback('no channel');
    }
    channel.pushMessage(route, msg, callback);
};




