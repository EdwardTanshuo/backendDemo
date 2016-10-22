var pomelo = require('pomelo');
var sync = require('pomelo-sync-plugin');
var mongoose = require('mongoose');
var loki = require('lokijs');

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


initDB();

var app = pomelo.createApp();
app.set('name', 'luluvr');

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
});

// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
