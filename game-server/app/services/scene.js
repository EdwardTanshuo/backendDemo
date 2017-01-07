var Scene = require('../models/scene');
var Transaction = require('../models/transaction');
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
    var self = this;

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
function resetScene(scene, callback){
    console.log('-----reset Scene -----------');
    //回合加一
    scene.turns = scene.turns + 1;
    scene.status = 'init';
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

//玩家加入游戏
SceneService.prototype.addPlayer = function(roomId, role, serverId, callback){
    try{
        var self = this;
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene');
        }

        // 推送 玩家加入游戏消息
        var channel = channelService.getChannel(roomId, false);
        if(!channel) {
            return callback('no channel', null);
        }
        channel.pushMessage('PlayerEnterEvent', role);

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

        // 并把玩家加入channel
        channel.add(role.token, serverId);
        return callback(null, scene);
    } catch(err){
        return callback('memdb error when add player', null);
    }
}

//主播通知开始下注，并开始下注倒计时，
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

//玩家下注
SceneService.prototype.playerBet = function(roomId, role, bet, callback){
    var scene = sceneCollection.findOne({'room': roomId});
    console.log('----SceneService playerBet-------------');
    if(!scene){
        return callback('no scene');
    }
    if(scene.players[role.token] == null){
        return callback('player is not inside');
    }
    if(scene.status != 'betting'){
        return callback('game is not at betting');
    }

    if(scene.player_bets[role.token] > 0){
        return callback('player already bet');
    }

    if(bet <= 0){
        return callback('bet Can not be less than 0');
    }

    // 增加一条 Transaction
    var newTransaction = new Transaction();
    newTransaction.quantity = bet;
    newTransaction.type = 'bet';
    newTransaction.issuer = role.token;
    newTransaction.recipient = roomId;
    transactionCollection.insert(newTransaction);

    //  bet_amount-下注金额，bet_result-下注结果（win,lose,tie）
    //var player_bet = { token:role.token, bet_amount: bet, bet_result: ''};
    scene.player_bets[role.token] = bet;
    sceneCollection.update(scene);
    pushMessages(roomId, {role: role, bet: bet}, 'PlayerBetEvent',function(err){
        if(!!err){
            return callback(err);
        }
        return callback(null, newTransaction, bet);
    });
}

//主播开始游戏,并抽一张卡, 并开始玩家抽卡倒计时，倒计时结束调用 玩家抽卡结束
SceneService.prototype.startGame = function(roomId, callback){
    try {
    	var self = this;
        var scene = sceneCollection.findOne({'room': roomId});

        if (!scene) {
            return callback('startGame: no scene created yet');
        }

        //更新缓存
        try{
            scene.status = 'player_started';
            sceneCollection.update(scene);
        }catch(err){
            return callback('startGame: memdb error');
        }

        //加入随机的卡
        game.dealNextCard(scene.dealer_deck, function(err, newDeck, card){
            if(err){
                return callback(err);
            } 
            try{
                scene.dealer_platfrom.push(card);
                var newValue = game.calculateHandValue(scene.dealer_platfrom);
                scene.dealer_value = newValue;
                scene.dealer_deck = newDeck;
                sceneCollection.update(scene);
            }
            catch(e){
                return callback('startGame： 主播无法抽卡');
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
        });
    } catch(err){
        callback(err, null);
    }
}

//玩家抽卡
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

//玩家抽卡结束, 并开始主播抽卡倒计时，时间到调用 主播结束回合
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
                    console.log('################ room: ' + roomId + ', will end dealer turn, into dealerFinish ');
                    self.dealerFinish(roomId, function(err, result){});

                }, sceneConfig.durationDealerTurn, roomId);
                return callback(null, scene);
            }
        });
        
    } catch(err){
        callback(err);
    }
}

//主播抽卡
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
                pushMessages(roomId, {card: card, value: newValue}, 'DealerGetCardEvent', function(err){
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

//主播结束回合，生成下注排行榜，重置游戏，开始下一回合
SceneService.prototype.dealerFinish = function(roomId, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback('no scene');
        }
        if(scene.status != 'dealer_turn'){
            return callback('game is not dealer turn yet');
        }

          //增加测试假数据
        //var token1 = '1e123d23123e23e2wed23';
        //var token2 = '2e123d23123e23e2wed23';
        //var token3 = '3e123d23123e23e2wed23';
        //var token4 = '4e123d23123e23e2wed23';
        //var token5 = '5e123d23123e23e2wed23';
        //scene.player_bets[token1] = 45;
        //scene.player_bets[token2] = 69;
        //scene.player_bets[token3] = 57;
        //scene.player_bets[token4] = 40;
        //scene.player_bets[token5] = 78;
        //scene.players[token1] = {
        //    "sid":"connector-server-1", "exp":0, "level":0, "deckId":"default", "__v":0, "avatar":"", "foreignId":40,
        //    "token":"d858bd235c7faf19f5da18a1118788e2", "wealth":0, "name":"test1", "_id":"584ba72f14be927319de49b1"
        //};
        //scene.players[token2] = {
        //    "sid":"connector-server-1", "exp":0, "level":0, "deckId":"default", "__v":0, "avatar":"", "foreignId":40,
        //    "token":"d858bd235c7faf19f5da18a1118788e2", "wealth":0, "name":"test2", "_id":"584ba72f14be927319de49b1"
        //};
        //scene.players[token3] = {
        //    "sid":"connector-server-1", "exp":0, "level":0, "deckId":"default", "__v":0, "avatar":"", "foreignId":40,
        //    "token":"d858bd235c7faf19f5da18a1118788e2", "wealth":0, "name":"test3", "_id":"584ba72f14be927319de49b1"
        //};
        //scene.players[token4] = {
        //    "sid":"connector-server-1", "exp":0, "level":0, "deckId":"default", "__v":0, "avatar":"", "foreignId":40,
        //    "token":"d858bd235c7faf19f5da18a1118788e2", "wealth":0, "name":"test4", "_id":"584ba72f14be927319de49b1"
        //};
        //scene.players[token5] = {
        //    "sid":"connector-server-1", "exp":0, "level":0, "deckId":"default", "__v":0, "avatar":"", "foreignId":40,
        //    "token":"d858bd235c7faf19f5da18a1118788e2", "wealth":0, "name":"test5", "_id":"584ba72f14be927319de49b1"
        //};
        //scene.player_values[token1] = { value: 5, busted: false, numberOfHigh: 34 };
        //scene.player_values[token2] = { value: 14, busted: false, numberOfHigh: 25 };
        //scene.player_values[token3] = { value: 9, busted: false, numberOfHigh: 57 };
        //scene.player_values[token4] = { value: 25, busted: false, numberOfHigh: 86 };
        //scene.player_values[token5] = { value: 18, busted: false, numberOfHigh: 35 };


        var player_bets = scene.player_bets;
        console.log('-----player_bets -----------');
        console.log(player_bets);

        var rankingList = [];

        for (var k in player_bets) {
            console.log('-----single player_bet -----------');
            console.log(k);
            var bet = player_bets[k];
            console.log(bet);
            var dealerValue = scene.dealer_value;
            var playValue = scene.player_values[k];
            console.log(dealerValue);
            console.log(playValue);
            // 计算玩家输赢
            var bunko = game.determinePlayerWin(dealerValue, playValue);
            console.log(bunko);
            var player = scene.players[k];

            // 如果玩家是赢了， 就生成Reward类型Transaction。
            if(bunko == 'win'){
                var newTransaction = new Transaction();
                newTransaction.quantity = bet * sceneConfig.durationDealerTurn;
                newTransaction.type = 'Reward';
                newTransaction.issuer = roomId;
                newTransaction.recipient = player.token;
                transactionCollection.insert(newTransaction);
            }

            // 添加到排行榜中
            rankingList.push({
                bunko: bunko,
                quantity: bet,
                play_value: playValue,
                dealer_value: dealerValue,
                player: player
            })
        }

        // todo: 同步scene到mysql
        console.log('-----sync scene -----------');
        console.log(scene);


        // todo: 同步Transaction数据到mysql
        console.log('-----sync Transaction -----------');



        //重置游戏 更新游戏状态
        resetScene(scene, function(err, newScene){
            if(err){
                return callback(err);
            }

            try{
                sceneCollection.update(newScene);
            } catch(e){
                return callback('dealerFinish: memdb crash');
            }

            pushMessages(roomId, {scene: newScene, ranking_list: rankingList }, 'DealerFinishEvent', function(err){
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

//游戏结束
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

//获得当前玩家数量
SceneService.prototype.getNumberOfPlayers = function(room_id){
	var scene = sceneCollection.findOne({'room': room_id});
	if(!scene){
		return 0;
	}
	return scene.players.length();
}

//玩家离开游戏
SceneService.prototype.removePlayer = function(roomId, role, callback){
	try{
        //更新scene
		var scene = sceneCollection.findOne({'room': roomId});
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

        //从channel中去除 player 并推送PlayerLeaveEvent消息
        var channel = channelService.getChannel(roomId, true);
        if(!channel) {
            return callback('no channel', null);
        }
        channel.pushMessage({route: 'PlayerLeaveEvent', role: role});
		callback(null, player_platfrom, player_value, player_bet, player);

	}
	catch(err){
		callback(err);
	}
}

SceneService.prototype.playerFinish = function(room_id, token, callback){
	
}


// TODO:主播端人脸识别 并推送 UpdateFaceDetectorCoorEvent
SceneService.prototype.updateFaceDetectorCoor = function(roomId, params, callback){
    try{
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