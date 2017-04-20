var roleService = require('../../../services/role');
var utils = require('../../../util/utils');
var channelService = app.get('channelService');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

/**
 * New client entry.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.entry = function(msg, session, next) {
	  var self_app = this.app;
	  if(msg.token == null || msg.room == null){
          return next(null, { code: Code.COMMON.LESS_PARAM, result: 'PlayerEnter: missing params' });
	  }
	  roleService.auth(msg.room, msg.token, function(err, result){
	  		if(err){
                return next(null, { code: err.code, error: err.msg });
	  		} else{
	  			self_app.get('sessionService').kick(msg.token, function(err){
	  				if(err){
	  					return next(new Error(err), {code: Code.FAIL, error: 'PlayerEnter:' + err });
	  				} else{
	  					
	  					session.bind(msg.token, function(err){
			  				if(!err){
			  					session.set('token', msg.token);
			  					session.set('room', msg.room);
								session.set('currentRole', result);
								session.pushAll(function(err){
									if(err){
										return next(new Error(err), {code: Code.FAIL, error: 'PlayerEnter.session.bind:' + err});
									}
									
									roleEnter(self_app, session, function(err, scene){
					  					if(!!err){
                                            return next(new Error(err.msg), { code: err.code, result: err.msg });
						  				} else{
						  					
						  					session.on('closed', onRoleLeave.bind(null, self_app, session));
						  					return next(null, { code: Code.OK, result: scene});
						  				}
						  			});
								});
			  				} else{
			  					return next(null, {code: Code.FAIL, result: 'PlayerEnter.session.bind:' + err});
			  				}
			  			});
	  				}
	  			});
	  		}
	  });
};

var onRoleLeave = function (app, session) {
    console.log('------onRoleLeave----------');
    if(!session || !session.uid) {
        logger.error('Role leave error! %j', 'no session');
    }
    var roomId = session.get('room'),
        currentRole= session.get('currentRole'),
        serverId= app.get('serverId');

    //从channel中去除 player 并推送PlayerLeaveEvent消息
    /*var channel = channelService.getChannel(roomId, true);
    if(!channel) {
        logger.error('Role leave error! %j', 'no channel');
    }
    channel.leave(currentRole.token, serverId);

    var danmu = channelService.getChannel(roomId + '_danmu', true);
    if(!danmu) {
        logger.error('Role leave error! %j', 'no danmu_channel');
    }
    danmu.leave(currentRole.token, serverId);
	*/
    // 推送玩家离开消息给主播
    //var sid = channel.getMember(roomId)['sid'];
    //channelService.pushMessageByUids('PlayerLeaveEvent', { role: session.get('currentRole') }, [{ uid: roomId, sid: sid }]);
};

var roleEnter = function (app, session, callback) {
    var serverId = app.get('serverId'),
        currentRole = session.get('currentRole'),
        token = session.get('token');
	
	//本地创建卡组model
	var deckId = (currentRole.deckId != null) ? currentRole.deckId : 'default';
	var deck = utils.createDeck(deckId);
	if(deck == null){
		return callback('PlayerEnter: no such deck');
	}
	var new_model = {};
	new_model.deck = deck;
	new_model.token = token;

    //新用户的卡组加入用户缓存
	var find_result = roleDeckCollection.findOne({'token': token});
	if(find_result != null){
		//roleDeckCollection.update(find_result);
	} else{
		roleDeckCollection.insert(new_model);
	}

	//加入游戏scene
	app.rpc.scene.sceneRemote.playerEnter(session, session.get('room'), currentRole, serverId, callback);
};
