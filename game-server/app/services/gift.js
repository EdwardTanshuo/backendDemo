var request = require("request");
var Code = require('../../../shared/code');

function GiftService() {
}

GiftService.prototype.sendGift = function(token, gift, callback){
	if(token == null){
        return callback('syncRoleFromRemote: missing token');
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
        console.error(body);
        if(!!err){
            console.error(err);
            return callback({code: Code.Fail, msg: err });
        }
        return callback(null, body);
    });
};

GiftService.prototype.listGift = function(token, callback){
    if(token == null){
        return callback('syncRoleFromRemote: missing token');
    }
    var headers = {
       'content-type': 'application/json',
       'cache-control': 'no-cache'
    };
    headers[config.remote.remoteToken.name] = token;
    var options = {
        method: 'GET',
        url: config.remote.url + config.remote.api.listGift,
        headers: headers,
        json: true
    };
    request(options,  function(err, response, body){
        if(!!err){
            return callback({code: Code.Fail, msg: err });
        }
        return callback(null, body);
    });
};

module.exports = new GiftService();
