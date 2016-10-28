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
     if(token == null){
        return callback('misiing token', null); // error response 
     }
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
                name: broadcaster.name,
                room: broadcaster.room,
                avatar: broadcaster.avatar,
                location: broadcaster.location
            };
            
            return broadcasterService.create(obj, callback);
        }
        else{
            ///todo
            record.name = broadcaster.name;
            record.avatar = broadcaster.avatar;
            record.location = broadcaster.location;
            if(broadcaster.deleted){
                console.log('deleting broadcaster in server cache...');
                record.isDeleted = true;
                record.save(function(err, result){
                    if(err){
                        callback('err', null);
                    }
                    else{
                        callback('has been deleted', null);
                    }
                });
                return;
            }
            else{
                console.log('updating broadcaster in server cache...');
                return record.save(callback);
            }
        }
    });
};

DataSyncService.prototype.syncBroadcasterFromRemote = function(room_id, callback) {
     if(!room_id){
        return callback('missing room_id', null); // error response
     }
     var headers = {
        'content-type': 'application/json',
        'cache-control': 'no-cache'
     };
     headers[config.remote.remoteToken.name] = config.remote.remoteToken;

     var options = {
         method: 'GET',
         url: config.remote.url + config.remote.api.broadcasterGet + '/' + room_id,
         headers: headers
     };

     var syncBroadcaster = DataSyncService.prototype.syncBroadcaster;

     request(options, function(err, response, body){
         if (err) {
             callback(err, null); // error response
         } else {
                try{
                    var json = JSON.parse(body);
                    if(json.result){
                       json.result.room = room_id;
                       return syncBroadcaster(json.result, callback); 
                    }
                    else{
                        return callback('broadcaster not exist', null); 
                    }
                    
                }
                catch(err){
                    callback(err, null); // successful response
                }
        }
     });
};

module.exports = new DataSyncService();