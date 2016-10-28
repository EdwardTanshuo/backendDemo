var request = require("request");

function DataSyncService() {
}

DataSyncService.prototype.syncRole = function(role, callback) {
    var roleService = require('./role');
    roleService.hasOne(role, function(err, record){
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
            console.log('updating user in server cache...');
            return record.save(callback);
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

     var syncRole = DataSyncService.prototype.syncRole;

     request(options, function(err, response, body){
         if (err) {
             callback(err, null); // error response
         } else {
                try{
                    var json = JSON.parse(body);
                    if(json.result){
                       json.result.token = token;
                       return syncRole(json.result, callback); 
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

DataSyncService.prototype.syncBroadcaster = function(broadcaster, callback) {
    var broadcasterService = require('./broadcaster');
    broadcasterService.hasOne(broadcaster, function(err, record){
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
            console.log('updating user in server cache...');
            return record.save(callback);
        }
    });
};

DataSyncService.prototype.syncBroadcasterFromRemote = function(room_id, callback) {
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

     var syncRole = DataSyncService.prototype.syncRole;

     request(options, function(err, response, body){
         if (err) {
             callback(err, null); // error response
         } else {
                try{
                    var json = JSON.parse(body);
                    if(json.result){
                       json.result.token = token;
                       return syncRole(json.result, callback); 
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