
var channelService = app.get('channelService');

function PushService() {
}


PushService.prototype.pushMessages = function(roomId, msg, route, callback){
	var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    channel.pushMessage(route, msg, callback);
}

PushService.prototype.pushMessageToOne = function(roomId, uid, msg, route, callback){
    var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    var sid = channel.getMember(uid)['sid'];
    channelService.pushMessageByUids(route, msg, [{ uid: uid, sid: sid }], callback);
}

PushService.prototype.pushMessageToDealer = function(roomId, msg, route, callback){
    var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    var sid = channel.getMember(roomId)['sid'];
    channelService.pushMessageByUids(route, msg, [{ uid: roomId, sid: sid }], callback);
}

PushService.prototype.pushMessageToPlayers = function(roomId, msg, route, callback){
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback('room not found');
    } 
    var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    var group = [];
    Object.keys(scene.player_bets).filter((key) => {
        return scene.player_bets[key] > 0;
    }).map((uid) => {
        group.push({ uid: uid, sid: channel.getMember(uid)['sid'] });
    });
    
    // add broadcaster
    var sid = channel.getMember(roomId)['sid'];
    group.push({uid: roomId, sid: sid});

    if(group.length > 0){
        return channelService.pushMessageByUids(route, msg, group, callback);
    }

    return callback('pushMessage: no target');
}

module.exports = new PushService();