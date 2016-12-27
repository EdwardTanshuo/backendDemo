var Scene = require('../models/scene');
var game = require('../console/game');
var utils = require('../util/utils');
var channelService = app.get('channelService');
var sceneConfig = require('../../config/scene');

function pushMessages(roomId, msg, route, callback){
	var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    channel.pushMessage(route, msg, callback);
}

//初始化游戏信息
function initScene(roomId, dealer, callback){
	//初始化游戏场景
	var newScene = new Scene();
	newScene.room = roomId;
	newScene.status = 'init';

    //初始化玩家列表
	newScene.players = {};
	newScene.player_platfroms = {};
	newScene.player_values = {};
	newScene.player_bets = {};
		
    //初始化主播信息
	newScene.dealer = dealer;
	newScene.dealer_platfrom = [];
	newScene.dealer_value =  {value: 0, busted: false, numberOfHigh: 0};
	newScene.dealer_bets = 0;
	newScene.dealer_deck = [];
	newScene.turns = 0;

    //初始化计时器信息
    newScene.durationBet = sceneConfig.durationBet;
    newScene.durationPlayerTurn = sceneConfig.durationPlayerTurn;
    newScene.durationDealerTurn = sceneConfig.durationDealerTurn;
    
	//创建主播卡组
    try{
        var deckId = 'default';
        var newDeck = utils.createDeck(deckId);
        if(!newDeck){
            return callback('dealer deck could not be created');
        }
        newScene.dealer_deck = newDeck;
        return callback(null, newScene);
    } catch(err){
       return callback('dealer deck could not be created');
    }
}

//重置游戏信息
function resetScene(roomId, scene, callback){
    //回合加一
    scene.turns = scene.turns + 1;

    //重置玩家列表
    var tokens = Object.keys(scene.players);
    var i = 0;
    for(var i = 0; i < tokens.length; i++){
        scene.player_platfroms[tokens[i]] = [];
        scene.player_values[tokens[i]] = {value: 0, busted: false, numberOfHigh: 0};
        scene.player_bets[tokens[i]] = 0;
    }
    
    //重置主播信息
    scene.dealer_platfrom = [];
    scene.dealer_value =  {value: 0, busted: false, numberOfHigh: 0};
    scene.dealer_bets = 0;
    scene.dealer_deck = [];
    
    //创建主播卡组
    try{
        var deckId = 'default';
        var newDeck = utils.createDeck(deckId);
        if(!newDeck){
            return callback('dealer deck could not be created');
        }
        scene.dealer_deck = newDeck;
        return callback(null, scene);
    } catch(err){
       return callback('dealer deck could not be reseted');
    }
}

function SceneService() {
}

//主播创建游戏
SceneService.prototype.createGame = function(dealer, roomId, callback) {
	var scene = sceneCollection.findOne({'room': roomId});
    //主播 非主观意图断开游戏，重新加入
	if(scene){
        return callback('createGame: game has been created', scene);
	} else{
        //初始化游戏场景
		initScene(roomId, dealer, function(err, newScene){
			 //更新缓存
			try{
				sceneCollection.insert(newScene);
	            return callback(null, newScene);
			} catch(err){
				return callback('createGame: memdb error');
			}
		});
	}
}

//主播通知开始下注
SceneService.prototype.startBet = function(roomId, callback){
    try {
        var self = this;
        var scene = sceneCollection.findOne({'room': roomId});

        if (!scene) {
            return callback('startBet: no scene created yet');
        }
        if (scene.status != 'init') {
            return callback('game is not at init');
        }
        //更新缓存
        try{
            scene.status = 'betting';
            sceneCollection.update(scene);
        }catch(err){
            return callback('startBet: memdb error');
        }

        pushMessages(roomId, scene, 'BetStartEvent', function(err){
            if(!!err){
                return callback(err);
            }
            else{
                 //开启计时器
                setTimeout(function(roomId) {
                    var scene = sceneCollection.findOne({'room': roomId});
                    if(!scene || scene.status != 'betting'){
                        return;
                    }
                    self.cancelGame(roomId, function(err, result){

                    });
                    return console.log('################ room: ' + roomId + ', will cancel game');
                }, sceneConfig.durationBet, roomId);
                return callback(null, scene);
            }
        });
    } catch(err){
        return callback(err, null);
    }
}

//主播开始游戏
SceneService.prototype.startGame = function(roomId, callback){
    try {
    	var self = this;
        var scene = sceneCollection.findOne({'room': roomId});

        if (!scene) {
            return callback('startGame: no scene created yet');
        }
        if (scene.status != 'betting') {
            return callback('game status is not at betting');
        }
        //更新缓存
        try{
            scene.status = 'player_started';
            sceneCollection.update(scene);
        }catch(err){
            return callback('startGame: memdb error');
        }

        pushMessages(roomId, scene, 'GameStartEvent', function(err){
        	if(!!err){
        		callback(err);
        	}
        	else{
        		 //开启计时器
		        setTimeout(function(roomId) {
                    var scene = sceneCollection.findOne({'room': roomId});
                    if(!scene || scene.status != 'player_started'){
                        return;
                    }
		        	self.endPlayerTurn(roomId, function(err, result){

                    });
				 	console.log('################ room: ' + roomId + ', will end players turn');
				}, sceneConfig.durationPlayerTurn, roomId);
		        return callback(null, scene);
        	}
        });
    } catch(err){
        callback(err, null);
    }
}

SceneService.prototype.endPlayerTurn = function(roomId, callback){
    try {
    	var self = this;
        var scene = sceneCollection.findOne({'room': roomId});
        if (!scene) {
            return callback('startGame: no scene created yet');
        }
        if (scene.status != 'player_started') {
            return callback('game is not at player turn');
        }
        scene.status = 'dealer_turn';
        sceneCollection.update(scene);
        pushMessages(roomId, scene, 'EndPlayerEvent', function(err){
            if(!!err){
                return callback(err);
            } else{
                 //开启计时器
                setTimeout(function(roomId) {
                    var scene = sceneCollection.findOne({'room': roomId});
                    if(!scene || scene.status != 'dealer_turn'){
                        return;
                    }
                    self.dealerFinish(roomId, function(err, result){

                    });
                    console.log('################ room: ' + roomId + ', will end dealer turn');
                }, sceneConfig.durationDealerTurn, roomId);
                return callback(null, scene);
            }
        });
        
    } catch(err){
        callback(err);
    }
}

SceneService.prototype.endGame = function(roomId, callback) {
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('game not exist', scene);
        } else {
            sceneCollection.remove(scene);
            return callback(null, scene);
        }
    } catch(err){
        return callback(err);
    }
}

SceneService.prototype.addPlayer = function(roomId, role, serverId, callback){
    try{
        var self = this;
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene');
        }

        //TODO: 游戏人数不够的话
        
        //如果玩家已加入游戏， 返回当前游戏状态
        if(scene.players[role.token] != null){
            return callback(null, scene);
        }
        //否则创建新的玩家状态
        role.sid = serverId;
        scene.players[role.token] = role;
        scene.player_platfroms[role.token] = [];
        scene.player_values[role.token] = {value: 0, busted: false, numberOfHigh: 0};
        scene.player_bets[role.token] = 0;
        sceneCollection.update(scene);
        callback(null, scene);
    } catch(err){
        return callback('memdb error when add player', null);
    }
}

SceneService.prototype.getNumberOfPlayers = function(room_id){
	var scene = sceneCollection.findOne({'room': room_id});
	if(!scene){
		return 0;
	}
	return scene.players.length();
}


SceneService.prototype.removePlayer = function(room_id, role, callback, serverId){
	try{
		var scene = sceneCollection.findOne({'room': room_id});
		if(!scene){
			return callback('no scene', null);
		}
		if(scene.players[role.token] == null){
			return callback('player is not inside', null);
		}
		
		var player = scene.players[role.token];
		scene.players[role.token] = undefined;

		var player_platfrom = scene.player_platfroms[role.token];
		scene.player_platfroms[role.token] = undefined;

		var player_value = scene.player_values[role.token];
		scene.player_values[role.token] = undefined;

		var player_bet = scene.player_bets[role.token];
		scene.player_bets[role.token] = undefined;

		sceneCollection.update(scene);
		callback(null, {player_platfrom: player_platfrom, player_value: player_value, player_bet: player_bet, player: player});

	}
	catch(err){
		callback(err);
	}

}

SceneService.prototype.addBet = function(room_id, token, value, callback){
    var scene = sceneCollection.findOne({'room': room_id});
        
    if(!scene){
        return callback('no scene');
    }
    if(scene.players[token] == null){
        return callback('player is not inside');
    }
    if(scene.status != 'init'){
        return callback('game is not at init');
    }

    return callback(null, {});
}

SceneService.prototype.playerDraw = function(room_id, token, deck, callback){
	try{
		var scene = sceneCollection.findOne({'room': room_id});
        
		if(!scene){
			return callback('no scene');
		}
		if(scene.players[token] == null){
			return callback('player is not inside');
		}
		if(scene.status != 'player_started'){
			return callback('game is not at player turn');
		}
        if(scene.player_values[token].busted){
            return callback('busted');
        }
        
		game.dealNextCard(deck, function(err, newDeck, card){
            try{
                scene.player_platfroms[token].push(card); 
                var newValue = game.calculateHandValue(scene.player_platfroms[token]);
                scene.player_values[token] = newValue;
                return callback(null, newDeck, card, newValue);
            } catch(err){
                return callback('playerDraw: can not add card onto the platform');
            }
			
		});
	}
	catch(err){
		callback('playerDraw: memdb crashed');
	}
}

SceneService.prototype.playerFinish = function(room_id, token, callback){
	
}

SceneService.prototype.dealerDrawCard = function(roomId, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene');
        }
        if(scene.status != 'dealer_turn'){
            return callback('game is not dealer turn yet');
        }
        if(scene.dealer_value.busted){
            return callback('busted');
        }

        game.dealNextCard(scene.dealer_deck, function(err, newDeck, card){
            //更新卡组
            try{
                scene.dealer_platfrom.push(card);
                var newValue = game.calculateHandValue(scene.dealer_platfrom);
                scene.dealer_value = newValue;
                scene.dealer_deck = newDeck;
                sceneCollection.update(scene);
                
                //推送DealerGetCardEvent 广播主播抽到的卡
                pushMessages(roomId, card, 'DealerGetCardEvent', function(err){
                    if(!!err){
                        return callback(err);
                    }
                    return callback(err, newDeck, card, newValue);
                });
            } catch(err){
                return callback('can not update dealer deck');
            }

        });
    } catch(err){
        return callback('dealerDrawCard: memdb crash', null);
    }
}

//主播结束回合
SceneService.prototype.dealerFinish = function(roomId, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene');
        }
        if(scene.status != 'dealer_turn'){
            return callback('game is not dealer turn yet');
        }

        //更新游戏状态
        scene.status = 'init';
        
        resetScene(roomId, scene, function(err, newScene){
            if(err){
                return callback(err);
            }
            try{
                sceneCollection.update(newScene); 
            } catch(e){
                return callback('dealerFinish: memdb crash');
            }
            
            pushMessages(roomId, newScene, 'DealerFinishEvent', function(err){
                if(!!err){
                    return callback(err);
                }
                return callback(null, newScene);
            });
        });
    } catch(err){
        return callback(err);
    }
}

//主播取消游戏
SceneService.prototype.cancelGame = function(roomId, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene');
        }
        if(scene.status != 'betting'){
            return callback('game is not at betting yet');
        }

        //更新游戏状态
        scene.status = 'init';
        sceneCollection.update(scene);

        pushMessages(roomId, scene, 'CancelGameEvent', function(err){
            if(!!err){
                return callback(err);
            }
            return callback(null, scene);
        });
    } catch(err){
        return callback(err);
    }
}


// TODO:主播端人脸识别 并推送 UpdateFaceDetectorCoorEvent
SceneService.prototype.updateFaceDetectorCoor = function(roomId, params, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene');
        }

        pushMessages(roomId, params, 'UpdateFaceDetectorCoorEvent', function(err){
            if(!!err){
                return callback(err);
            }
            return callback(null, scene);
        });
    } catch(err){
        return callback(err);
    }
}


module.exports = new SceneService();