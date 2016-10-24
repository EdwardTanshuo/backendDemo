var pomelo = require('pomelo');
var sync = require('pomelo-sync-plugin');
var mongoose = require('mongoose');
var loki = require('lokijs');
var routeUtil = require('./app/util/routeUtil');

/**
 * Init app for client.
 */
global.config = require('./config/default');

function initSceneCache() {
       
        var dbmem = new loki('game.json');
        
        var sceneCollection = dbmem.addCollection('sceneCollection');
        sceneCollection.constraints.unique['broad'];
        global.sceneCollection = sceneCollection;
}

function initMongo(){
   mongoose.connect(config.mongo.uri);
        var db = mongoose.connection;
        //db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', () => {

            console.log("Connected to Mongo");
            global.db = db;

            loadModules();
        });
}


var app = pomelo.createApp();
app.set('name', 'luluvr');

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

  app.filter(pomelo.filters.timeout());

});

// app configuration
app.configure('production|development', 'connector', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.sioconnector,
      //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
      transports : ['websocket'],
      heartbeats : true,
      closeTimeout : 60,
      heartbeatTimeout : 60,
      heartbeatInterval : 25
    });
  initMongo();
});

app.configure('production|development', 'broadcaster', function(){
   app.set('connectorConfig',
    {
      connector : pomelo.connectors.sioconnector,
      //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
      transports : ['websocket'],
      heartbeats : true,
      closeTimeout : 60,
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
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.sioconnector,
      //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
      transports : ['websocket'],
      heartbeats : true,
      closeTimeout : 60,
      heartbeatTimeout : 60,
      heartbeatInterval : 25
    });
  initMongo();
  initSceneCache();
});



// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
