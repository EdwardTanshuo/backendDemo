var pomelo = require('pomelo');
var sync = require('pomelo-sync-plugin');
var mongoose = require('mongoose');
var loki = require('lokijs');
var routeUtil = require('./app/util/routeUtil');

/**
 * Init app for client.
 */
 global.config = require('./config/default');

 function initDB() {
        mongoose.connect(config.mongo.uri);
        var db = mongoose.connection;
        //db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', () => {

            console.log("Connected to Mongo");
            global.db = db;

            loadModules();
        });

        var dbmem = new loki('game.json');
        
        var roleCollection = dbmem.addCollection('roleCollection');
        roleCollection.constraints.unique['id'];
        global.roleCollection = roleCollection;
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
  initDB();
});

app.configure('production|development', 'manager', function(){
  var events = pomelo.events;

  app.event.on(events.ADD_SERVERS, instanceManager.addServers);

  app.event.on(events.REMOVE_SERVERS, instanceManager.removeServers);
});


app.configure('production|development', 'gate', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      useProtobuf : true
    });
});


// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
