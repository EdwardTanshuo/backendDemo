var express = require("express");
var fs = require("fs");

module.exports = function (app, opts) {
    opts = opts || {};
    return new ExpressProxy(app, opts);
};

var ExpressProxy = function (app, opts) {
    this.opts = opts;
    this.exp = express();  
    this.exp.use(express.bodyParser());

    this.exp.get("/start", function (req, res) { 
        console.log('&&&&&&&&&&&&&&&&&');
    });

    this.exp.get("/stop", function (req, res) { 
        console.log('&&&&&&&&&&&&&&&&&');
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
