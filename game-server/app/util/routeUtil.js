var exp = module.exports;

exp.scene = function(session, msg, context, cb) {
    if(!session.get('room')) {
        return cb(new Error('missing room'));
    }
	var sceneServers = app.getServersByType('scene');
	var hash = session.get('room');
	var lastChar = hash[hash.length -1];
	var code = lastChar.charCodeAt(0);
 	var id = sceneServers[code % sceneServers.length].id;
  	cb(null, id);
};

// todo: 可能要废弃
exp.channel = function(roomId) {
	var sceneServers = app.getServersByType('scene');
	var hash = roomId;
	var lastChar = hash[hash.length -1];
	var code = lastChar.charCodeAt(0);
 	var id = sceneServers[code % sceneServers.length].id;
 	return id;
};

exp.connector = function(session, msg, app, cb) {
	if(!session) {
		cb(new Error('fail to route to connector server for session is empty'));
		return;
	}

	if(!session.frontendId) {
		cb(new Error('fail to find frontend id in session'));
		return;
	}

	cb(null, session.frontendId);
};

exp.broadcaster = function(session, msg, app, cb) {
	if(!session) {
		cb(new Error('fail to route to connector server for session is empty'));
		return;
	}

	if(!session.frontendId) {
		cb(new Error('fail to find frontend id in session'));
		return;
	}

	cb(null, session.frontendId);
};