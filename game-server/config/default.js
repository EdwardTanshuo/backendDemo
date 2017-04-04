module.exports = {
	"mongo": {
    	"uri": "mongodb://localhost:27017/game"
  	},
  	"remote": {
	    "isSyncEnabled": true,
	    "url": "http://122.112.227.196",
        //"url": "http://127.0.0.1:8080",
	    "localToken": {
	      "name": "X_BS_TOKEN",
	      "value": "309281479082839178042"
	    },
	    "remoteToken": {
	      "name": "X_MCV_TOKEN",          
	      "value": "d858bd235c7faf19f5da18a1118788e2"
	    },
	    "api": {
	    	"userGet": "/api/account",
	    	"broadcasterGet": "/api/broadcasters",
            'scenePost': "/api/game/scene",
            'scenePostAgain': "/api/game/endScene",
            'transactionPost': "/api/transactions",
            'sendGift': "/api/giveGift"
	    }
    }
}