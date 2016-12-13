var roleService = require('../../../services/role');
var utils = require('../../../util/utils');
var channelService = app.get('channelService');
var Code = require('../../../../../shared/code');

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
	  	return next(new Error('missing params'), {code: Code.FAIL, error: 'missing params'});
	  }
	  roleService.auth(msg.token, function(err, result){
	  		if(err){
	  			return next(new Error(err), {code: Code.FAIL, error: err});
	  		}
	  		else{
	  			self_app.get('sessionService').kick(msg.token, function(err){
	  				if(err){
	  					return next(new Error(err), {code: Code.FAIL, error: err});
	  				}
	  				else{
	  					session.bind(msg.token, function(err){
			  				if(!err){
			  					session.set('token', msg.token);
			  					session.set('room', msg.room);
								session.set('currentRole', result);

								session.pushAll(function(err){

									if(err){
										return next(new Error(err), {code: Code.FAIL, error: err});
									}
									roleEnter(self_app, session, function(err, scene){
										if(err == null && scene == null){
											return;
										}
					  					if(err){
						  					return next(new Error(err), {code: Code.FAIL, error: err});
						  				}
						  				else{
						  					session.on('closed', onRoleLeave.bind(null, self_app, session, 'connection closed'));
						  					return next(null, {code: Code.OK, result: scene});
						  				}
						  			});
								});
			  				}
			  				else{
			  					return next(new Error(err), {code: Code.FAIL, error: err});
			  				}
			  			});
	  				}
	  			});
	  		}
	  });
};

var onRoleLeave = function (app, session, reason) {
	//TODO: 断开连接后需要完成的代码
	/*app.rpc.scene.sceneRemote.playerLeave(session, {token: session.get('token'), roomid: session.get('roomid')}, function(err){
		if(err){
			logger.error('player leave error! %j', err);
		}
	});*/
};

var roleEnter = function (app, session, callback) {
    var serverId = app.get('serverId');
	
	//本地创建卡组model
	var deckId = (session.get('currentRole').deckId != null) ? session.get('currentRole').deckId : 'default';
	console.log('------create deck for: ' + session.get('currentRole').name + ' with deckId: ' + deckId + ' ----------');
	var deck = utils.createDeck(deckId);
	if(deck == null){
		return callback('no such deck');
	}
	var new_model = {};
	new_model.deck = deck;
	new_model.token = session.get('token');

    //新用户的卡组加入用户缓存
	try{
		var find_result = roleDeckCollection.findOne({'token': session.get('token')});
		if(find_result != null){
			find_result.deck = new_model.deck;
			roleDeckCollection.update(find_result);
		}
		else{
			console.log('------ create deck.. ----------');
			roleDeckCollection.insert(new_model);
		}
	}
	catch(e){
		console.log('------ memdb ----------');
		return callback(e);
	}

	//加入游戏scene
	app.rpc.scene.sceneRemote.playerEnter(session, session.get('room'), session.get('currentRole'), serverId, callback);
};
