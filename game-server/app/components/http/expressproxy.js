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
    	app.get('backendSessionService').get(routeUtil.getBroadcasterServerID(uid), uid, (err, BackendSession) => {
    		if(!!err){
	        	return res.status(Code.FAIL).send({error: err});
	        }
	        if(BackendSession == null){
	        	return res.status(Code.FAIL).send({error: 'no session'});
	        }
    		app.rpc.scene.sceneRemote.streamEnd(BackendSession, uid, (err, result) => {
	        	if(!!err){
	        		return res.status(Code.FAIL).send({error: err});
	        	} else{
	        		return res.status(Code.OK).send({result: result});
	        	}
	        });
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
