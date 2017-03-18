var pomelo = require('pomelo');
var sync = require('pomelo-sync-plugin');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var loki = require('lokijs');
var routeUtil = require('./app/util/routeUtil');

/**
 * Init app for client.
 */
global.config = require('./config/default');
global.Code = require('../shared/code');

function initSceneCache() {
    var dbmem = new loki('game.json');
    var sceneCollection = dbmem.addCollection('sceneCollection');
    sceneCollection.constraints.unique['room'];
    global.sceneCollection = sceneCollection;
}

function initRoleDeckCache() {
    var dbmem = new loki('roleDeck.json');
    var roleDeckCollection = dbmem.addCollection('roleDeckCollection');
    roleDeckCollection.constraints.unique['token'];
    global.roleDeckCollection = roleDeckCollection;
}

// 交易记录缓存
function initTransactionCache() {
    var dbmem = new loki('transaction.json');
    global.transactionCollection = dbmem.addCollection('transactionCollection');
}

function initMongo(){
   mongoose.connect(config.mongo.uri);
        var db = mongoose.connection;
        //db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', () => {

            console.log("Connected to Mongo");
            global.db = db;
        });
}

var app = pomelo.createApp();
app.set('name', 'luluvr');
global.app = app;

//globel
// configure for global
app.configure('production|development', function() {
  app.before(pomelo.filters.toobusy());
  app.enable('systemMonitor');

  // proxy configures
  app.set('proxyConfig', {
    cacheMsg: true,
    interval: 30,
    lazyConnection: true
    // enableRpcLog: true
  });

  // remote configures
  app.set('remoteConfig', {
    cacheMsg: true,
    interval: 30
  });

  // route configures
  app.route('connector', routeUtil.connector);
  app.route('broadcaster', routeUtil.broadcaster);
  app.route('scene', routeUtil.scene);
 
  app.filter(pomelo.filters.timeout());

});

// app configuration
app.configure('production|development', 'connector', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      useProtobuf : false,
      //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
      //transports : ['websocket'],
      heartbeats : true,
      closeTimeout : 60000,
      heartbeatTimeout : 600,
      heartbeatInterval : 25
    });
  initMongo();
  initRoleDeckCache();
});

// app configuration
app.configure('production|development', 'broadcaster', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.sioconnector,
      useProtobuf : true,
      //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
      //transports : ['websocket'],
      heartbeats : true,
      closeTimeout : 60000,
      heartbeatTimeout : 60,
      heartbeatInterval : 25
    });
    initMongo();
});


app.configure('production|development', 'gate', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      useProtobuf : true
    });
});

app.configure('production|development', 'scene', function(){
  initMongo();
  initSceneCache();
  initTransactionCache();
});

app.set('errorHandler', function(err, msg, resp, session, next) {
  next(err, resp); 
});

// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
