var request = require("request");
var Code = require('../../../shared/code');

function DataSyncService() {
}

DataSyncService.prototype.syncRole = function(role, callback) {
    var roleService = require('./role');
    roleService.hasOne(role, function(err, record){
        if(err){
            return callback({code: Code.FAIL, msg: 'syncRole: '+err });
        } else if(!record){
            var obj = {
                name: role.username,
                foreignId: role.id,
                avatar: role.avatar,
                wealth: role.wealth,
                token: role.token
            };
            return roleService.create(obj, callback);
        } else{
            record.name = role.username;
            record.avatar = role.avatar;
            record.wealth = role.wealth;
            console.log('updating user in server cache...');
            console.log(record);
            return record.save(callback);
        }
    });
};

DataSyncService.prototype.syncRoleFromRemote = function(token, callback) {
     if(token == null){
         return callback({code: Code.COMMON.LESS_PARAM, msg: 'syncRoleFromRemote: misiing token' });
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
             return callback({code: Code.FAIL, msg: 'syncRoleFromRemote: '+err });
         } else {
            try{
                var json = JSON.parse(body);
                if(json.result){
                   json.result.token = token;
                   return syncRole(json.result, callback);
                } else{
                    return callback({code: Code.PLAYER.NO_PLAYER, msg: 'syncRoleFromRemote: user not exist' });
                }
            } catch(error){
                return callback({code: Code.FAIL, msg: 'syncRoleFromRemote: '+err });
            }
        }
     });
};

DataSyncService.prototype.syncBroadcaster = function(broadcaster, callback) {
    var broadcasterService = require('./broadcaster');


    broadcasterService.hasOne(broadcaster, function(err, record){
        if(err){
            return callback(err, null);
        } else if(!record){
            var obj = {
                name: broadcaster.name,
                room: broadcaster.room,
                avatar: broadcaster.avatar,
                wealth: broadcaster.wealth,
                location: broadcaster.location
            };
            
            return broadcasterService.create(obj, callback);
        } else{

            record.name = broadcaster.name;
            record.avatar = broadcaster.avatar;
            record.wealth = broadcaster.wealth;
            record.location = broadcaster.location;
            if(broadcaster.deleted){
                console.log('deleting broadcaster in server cache...');
                record.isDeleted = true;
                record.save(function(err, result){
                    if(err){
                        callback('err', null);
                    } else{
                        callback('has been deleted', null);
                    }
                });
                return;
            } else{
                console.log('=====bbbbbbbbbbbbb===========')
                console.log(record);
                console.log('updating broadcaster in server cache...');
                return record.save(callback);
            }
        }
    });
};

DataSyncService.prototype.syncBroadcasterFromRemote = function(roomId, callback) {
     if(!roomId){
         return callback('syncRoleFromRemote: misiing room_id');
     }
     var headers = {
        'content-type': 'application/json',
        'cache-control': 'no-cache'
     };
     headers[config.remote.remoteToken.name] = config.remote.remoteToken.value;

     var options = {
         method: 'GET',
         url: config.remote.url + config.remote.api.broadcasterGet + '/' + roomId,
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
                       json.result.room = roomId;
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

DataSyncService.prototype.syncSceneToRemote = function(scene, callback) {
    if(!scene){
        return callback('syncSceneToRemote missing params', null); // error response
    }
    var headers = {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache'
    };

    headers[config.remote.remoteToken.name] = config.remote.remoteToken.value;

    console.log('---------- start sync scene ...');
    console.log(scene);

    var options = {
        method: 'POST',
        url: config.remote.url + config.remote.api.scenePost ,
        headers: headers,
        json: true,
        body: scene
    };

    request(options,  function(err, response, body){
        if (err) {
            callback(err, null); // error response
        } else {
            try{
                if(body.result){
                    console.log('------syncSceneToRemote success resulte');
                    console.log(body.result);
                    return callback(null, body.result);
                } else{
                    return callback('syncSceneToRemote error', null);
                }
            }
            catch(err){
                callback(err, null); // successful response
            }
        }
    });
};

DataSyncService.prototype.syncTransactionToRemote = function(transactions, callback) {
    if(!transactions){
        return callback('syncTransactionToRemote missing params', null); // error response
    }
    var headers = {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache'
    };

    //headers[config.remote.remoteToken.name] = config.remote.remoteToken.value;
    headers['X_MCV_TOKEN'] = 'd858bd235c7faf19f5da18a1118788e2';

    console.log('---------- start sync transaction ...');
    console.log(transactions);

    var options = {
        method: 'POST',
        //url: config.remote.url + config.remote.api.scenePost ,
        url: 'http://localhost:8080' + config.remote.api.transactionPost ,
        headers: headers,
        json: true,
        body: transactions
    };

    request(options,  function(err, response, body){
        if (err) {
            callback(err, null); // error response
        } else {
            try{
                if(body.result){
                    console.log('------syncTransactionToRemote success resulte');
                    console.log(body.result);
                    return callback(null, body.result);
                }
                else{
                    return callback('syncTransactionToRemote error', null);
                }
            }
            catch(err){
                callback(err, null); // successful response
            }
        }
    });
};

module.exports = new DataSyncService();