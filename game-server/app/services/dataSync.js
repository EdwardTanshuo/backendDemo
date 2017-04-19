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
                token: role.token,
                diamond: role.diamond,
                intimacy: role.intimacy,
                level: role.level,
                exp: role.experience,
                next_level_experience: role.next_level_experience,
                follow: role.follow
            };
            return roleService.create(obj, callback);
        } else{
            record.name = role.username;
            record.avatar = role.avatar;
            record.wealth = role.wealth;
            record.diamond = role.diamond;
            record.intimacy = role.intimacy;
            record.level = role.level;
            record.exp = role.experience;
            record.next_level_experience = role.next_level_experience;
            record.follow = role.follow;
            console.log('updating user in server cache...');
            console.log(record);
            return record.save(callback);
        }
    });
};

DataSyncService.prototype.syncRoleFromRemote = function(room, token, callback) {
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
         url: config.remote.url + config.remote.api.userGet,
         headers: headers,
         json: true,
         body: {room: room}
     };

     var syncRole = DataSyncService.prototype.syncRole;

     request(options, function(err, response, body){
        if(!!err) {
            return callback({code: Code.FAIL, msg: 'syncRoleFromRemote: '+ err });
        } else {
            if(body.result){
                body.result.token = token;
                return syncRole(body.result, callback);
            } else{
                return callback({code: Code.PLAYER.NO_PLAYER, msg: 'syncRoleFromRemote: user not exist' });
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
                        callback(err);
                    } else{
                        callback('has been deleted');
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
                    console.log(body);
                    var json = JSON.parse(body);
                    if(json.result){
                       json.result.room = roomId;
                       return syncBroadcaster(json.result, callback);
                    }
                    else{
                        return callback('broadcaster not exist when sync from php');
                    }

                }
                catch(err){
                    callback(err, null); // successful response
                }
        }
     });
};

DataSyncService.prototype.syncSceneToRemote = function(params, callback) {
    if(!params.sceneId || !params.roomId){
        return callback('syncSceneToRemote missing params'); // error response
    }
    var headers = {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache'
    };

    headers[config.remote.remoteToken.name] = config.remote.remoteToken.value;

    console.log('---------- start sync scene ...');
    console.log(params);

    var options = {
        method: 'POST',
        url: config.remote.url + config.remote.api.scenePost ,
        headers: headers,
        json: true,
        body: params
    };

    request(options, function(err, response, body){
        /*console.log(JSON.stringify(body));
        if (err) {
            callback(err); // error response
        } else {
                try{
                    if(body.result){
                        console.log('------syncSceneToRemote success result');
                        return callback(null, body.result);
                    } else{
                        return callback(body.errors.message, null);
                    }
                }
            catch(err){
                return callback('error when parse response body'); // successful response
            }
        }*/
        return callback();
    });
};

DataSyncService.prototype.syncAgainSceneToRemote = function(scene, callback) {
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
        url: config.remote.url + config.remote.api.scenePostAgain,
        headers: headers,
        json: true,
        body: scene
    };

    request(options,  function(err, response, body){
        /*if (err) {
            callback(err, null); // error response
        } else {
            try{
                if(body.success){
                    console.log('------syncSceneToRemote success result');
                    console.log(body);
                    return callback(null, body);
                } else{
                    return callback('syncSceneToRemote error', null);
                }
            }
            catch(err){
                return callback(err);
            }
        }*/
        return callback();
    });
};


DataSyncService.prototype.syncTransactionToRemote = function(transactionList, callback) {
    if(!transaction){
        return callback('syncTransactionToRemote missing params', null); // error response
    }
    var headers = {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache'
    };

    headers[config.remote.remoteToken.name] = config.remote.remoteToken.value;

    console.log('---------- start sync transactionList ...');
    console.log(transactionList);

    var options = {
        method: 'POST',
        url: config.remote.url + config.remote.api.transactionPost ,
        headers: headers,
        json: true,
        body: transactionList
    };

    request(options,  function(err, response, body){
        if (err) {
            callback(err); // error response
        } else {
             console.log('------syncTransactionToRemote success result');
             console.log(body);
             return callback(null);
        }
    });
};

DataSyncService.prototype.followActivity = function(params, callback) {
    if(params.broadcaster_id === null){
        return callback('followActivity missing params: broadcaster_id', null); // error response
    }
    if(params.follow === null){
        return callback('followActivity missing params: follow', null); // error response
    }
    if(params.token === null){
        return callback('followActivity missing params: token', null); // error response
    }

    var headers = {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache'
    };
    headers[config.remote.remoteToken.name] = params.token;

    console.log('---------- start followActivity ...');
    var options = {
        method: 'POST',
        url: config.remote.url + config.remote.api.follow ,
        headers: headers,
        json: true,
        body: params
    };
    request(options,  function(err, response, body){
        if (!!err) {
            callback(err, null); // error response
        } else {
             console.log('------followActivity success result');
             console.log(body);
             return callback(null, body.result);
        }
    });
};

module.exports = new DataSyncService();