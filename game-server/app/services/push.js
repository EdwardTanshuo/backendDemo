
var channelService = app.get('channelService');
var roleService = require('./role');

function PushService() {
}


PushService.prototype.pushMessages = function(roomId, msg, route, callback){
	var channel = channelService.getChannel(roomId, false);
    if (!channel) {
        return callback('no channel');
    }
    channel.pushMessage(route, msg, callback);
}

PushService.prototype.pushMessageToOne = function(roomId, uid, msg, route, callback){
    var channel = channelService.getChannel(roomId, false);
    if (!channel) {
        return callback('no channel');
    }
    var sid = channel.getMember(uid)['sid'];
    channelService.pushMessageByUids(route, msg, [{ uid: uid, sid: sid }], callback);
}

PushService.prototype.pushMessageToDealer = function(roomId, msg, route, callback){
    var channel = channelService.getChannel(roomId, false);
    if (!channel) {
        return callback('no channel');
    }
    if(!channel.getMember(roomId)){
        return callback();
    }
    var sid = channel.getMember(roomId)['sid'];
    return channelService.pushMessageByUids(route, msg, [{ uid: roomId, sid: sid }], callback);
}

PushService.prototype.pushMessageToPlayers = function(roomId, msg, route, callback){
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback('room not found');
    } 

    var storedPlayers = roleService.getAllInGame(roomId);

    var channel = channelService.getChannel(roomId, false);
    if (!channel) {
        return callback('no channel');
    }
    var group = [];

    roleService.getAllInGame(roomId).filter((aRole) => {
        return aRole.inGame;
    }).map((aRole) => {
        return group.push({ uid: aRole.token, sid: channel.getMember(aRole.token)['sid'] });
    });
    
    // add broadcaster
    if(!!channel.getMember(roomId)){
        var sid = channel.getMember(roomId)['sid'];
        group.push({uid: roomId, sid: sid});
    }
   
    if(group.length > 0){
        return channelService.pushMessageByUids(route, msg, group, callback);
    }

    return callback('pushMessage: no target');
}

module.exports = new PushService();