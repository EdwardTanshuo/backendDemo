var request = require("request");
var Code = require('../../../shared/code');

function GiftService() {
}

GiftService.prototype.sendGift = function(token, gift, callback){
	if(token == null){
        return callback({code: Code.COMMON.LESS_PARAM, msg: 'syncRoleFromRemote: missing token' });
    }
    var headers = {
       'content-type': 'application/json',
       'cache-control': 'no-cache'
    };
    headers[config.remote.remoteToken.name] = token;
    var options = {
        method: 'POST',
        url: config.remote.url + config.remote.api.sendGift,
        headers: headers,
        json: true,
        body: gift
    };
    request(options,  function(err, response, body){
    	return callback(err, body);
    };
};