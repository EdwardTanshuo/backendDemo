var request = require("request");

var roleService = require('./role');

var dataSyncService = require('./scene');

function DataSyncService() {
}

DataSyncService.prototype.syncRole = function(role, callback) {
     roleService.hasRecord(role, function(err, record){
        if(err){
            return callback(err, null);
        } 
        else if(!record){
            var obj = {
                name: role.username,
                foreignId: role.id,
                avatar: role.avatar,
                wealth: role.wealth,
                token: role.token
            };
            return roleService.create(obj, callback);
        }
        else{
            ///todo
            record.name = role.username;
            record.avatar = role.avatar;
            record.wealth = role.wealth;
            record.save(callback);
        }
     });
};

DataSyncService.prototype.syncRoleFromRemote = function(token, callback) {
     var headers = {
        'content-type': 'application/json',
        'cache-control': 'no-cache'
     };
     headers[config.remote.remoteToken.name] = token;

     var options = {
         method: 'GET',
         url: config.remote.url + config.remote.api.userGet,
         headers: headers
     };

     request(options, function(err, response, body){
         if (err) {
             callback(err, null); // error response
         } else {
                try{
                    var json = JSON.parse(body);
                    if(json.result){
                       json.result.token = token;
                       return this.syncRole(json.result, callback); 
                    }
                    else{
                        return callback('user not exist', null); 
                    }
                    
                }
                catch(err){
                    callback(err, null); // successful response
                }
        }
     });
};

module.exports = new DataSyncService();