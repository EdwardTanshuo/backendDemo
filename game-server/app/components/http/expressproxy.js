var express = require("express");
var Code = require('../../../../shared/code');
var utils = require('../../util/utils');
var routeUtil = require('../../util/routeUtil');

module.exports = function (app, opts) {
    opts = opts || {};
    return new ExpressProxy(app, opts);
};

var ExpressProxy = function (app, opts) {
	this.app = app;
    this.opts = opts;
    this.exp = express();  
    this.exp.use(express.bodyParser());

    this.exp.get("/start", function (req, res) { 
        return res.status(Code.OK).send('ok');
    });

    this.exp.get("/stop", function (req, res) { 
    	var uid = req.query.username;
    	if(!uid){
    		return res.status(Code.FAIL).send({error: 'no user id'});
    	}

    	app.get('backendSessionService').getByUid(routeUtil.getBroadcasterServerID(uid), uid, (err, backendSessions) => {
            consolo.log('serverID: ' + routeUtil.getBroadcasterServerID(uid));
    		if(!!err){
	        	return res.status(Code.FAIL).send({error: err});
	        }
	        if(!!backendSessions && !!backendSessions["0"]){
                var session = backendSessions['0'];
	        	app.rpc.scene.sceneRemote.streamEnd(session, uid, (err, result) => {
                    if(!!err){
                        return res.status(Code.FAIL).send({error: err});
                    } else{
                        return res.status(Code.OK).send({result: result});
                    }
                });
	        }
    		
            return res.status(Code.FAIL).send('no session');
    	});
    });
};

var pro = ExpressProxy.prototype;

pro.name = "__ExpressProxy__";

pro.start = function (cb) {
    this.exp.listen(3333);
    process.nextTick(cb);
};

pro.afterStart = function (cb) {
    process.nextTick(cb);
};

pro.stop = function (force, cb) {
    process.nextTick(cb);
};
