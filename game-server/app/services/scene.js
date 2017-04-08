var Scene = require('../models/scene');
var Transaction = require('../models/transaction');
var game = require('../console/game');
var utils = require('../util/utils');
var channelService = app.get('channelService');
var sceneConfig = require('../../config/scene');
var dataSyncService = require('./dataSync');
var async = require('async');

function pushMessages(roomId, msg, route, callback){
	var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    channel.pushMessage(route, msg, callback);
}

function pushMessageToOne(roomId, uid, msg, route, callback){
    var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    var sid = channel.getMember(uid)['sid'];
    channelService.pushMessageByUids(route, msg, [{ uid: uid, sid: sid }], callback);
}

function pushMessageToDealer(roomId, msg, route, callback){
    var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    var sid = channel.getMember(roomId)['sid'];
    channelService.pushMessageByUids(route, msg, [{ uid: uid, sid: sid }], callback);
}

function pushMessageToPlayers(roomId, msg, route, callback){
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback('room not found');
    } 
    var channel = channelService.getChannel(roomId, true);
    if (!channel) {
        return callback('no channel');
    }
    var group = [];
    Object.keys(scene.player_bets).filter((key) => {
        return scene.player_bets[key] > 0;
    }).map((uid) => {
        group.push({ uid: uid, sid: channel.getMember(uid)['sid'] });
    });
    
    // add broadcaster
    var sid = channel.getMember(roomId)['sid'];
    group.push({uid: roomId, sid: sid});

    if(group.length > 0){
        return channelService.pushMessageByUids(route, msg, group, callback);
    }

    return callback('pushMessage: no target');
}

function getDateTime(){
    var date = new Date();
    return date.format("yyyy-MM-dd hh:mm:ss");
};

//初始化游戏信息
function initScene(roomId, dealer, callback){
    var self = this;

    console.log('-----init Scene:' +  roomId + '-----------');
	
    //初始化游戏场景
	var newScene = new Scene();
	newScene.room = roomId;
	newScene.status = 'init';
    newScene.started_at = getDateTime(); //游戏创建时间
    //初始化玩家列表
	newScene.players = {};
	newScene.player_platfroms = {};
	newScene.player_values = {};
	newScene.player_bets = {};
		
    //初始化主播信息
	newScene.dealer = dealer;
	newScene.dealer_platfrom = [];
	newScene.dealer_value = {value: 0, busted: false, numberOfHigh: 0};
	newScene.dealer_bets = 0; // 主播冻结金额，等于 玩家下注总金额
	newScene.dealer_deck = [];
	newScene.turns = 0;

    //初始化计时器信息
    newScene.durationBet = sceneConfig.durationBet;
    newScene.durationPlayerTurn = sceneConfig.durationPlayerTurn;
    newScene.durationDealerTurn = sceneConfig.durationDealerTurn;
    
    //初始化排行
    newScene.rank = [];

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
    console.log('-----reset Scene:' + '-----------');
    //回合加一
    scene.turns = scene.turns + 1;
    scene.status = 'init';
    scene.bet_amount = 0;  //玩家下注总金额
    //重置玩家列表
    Object.keys(scene.players).map((token) => {
         scene.player_platfroms[token] = [];
         scene.player_values[token] = {value: 0, busted: false, numberOfHigh: 0};
         scene.player_bets[token] = 0;
    });
   
    //重置主播信息
    scene.dealer_platfrom = [];
    scene.dealer_value =  {value: 0, busted: false, numberOfHigh: 0};
    scene.dealer_deck = [];
    scene.player_bets = {};
    
    //创建主播卡组
    try{
        var deckId = 'default';
        var newDeck = utils.createDeck(deckId);
        if(!newDeck){
            return callback('dealer deck could not be created');
        }
        scene.dealer_deck = newDeck;
        // 保存 scene 到mongodb
        scene.save();
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
        //游戏已经创建，直接返回
        return callback(null, scene);
	} else{
        //初始化游戏场景
		initScene(roomId, dealer, function(err, newScene){
            try {
                if (!!err) {
                    return callback({code: Code.SCENE.CREATE_ERR, msg: 'createGame: ' + err});
                }
                //更新缓存
                sceneCollection.insert(newScene);
            } catch(e){
                return callback({code: Code.FAIL, msg: 'createGame:  memdb error'});
            }
            newScene.save((err) => {
                if(err){
                    return callback({code: Code.FAIL, msg: 'createGame:  ' + err});
                }
                dataSyncService.syncSceneToRemote({sceneId: newScene._id.toString(), roomId: roomId}, function(err, result){
                    if(!!err){
                        return callback(err);
                    }
                    return callback(null, newScene);
                });
            });
		});
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
            return callback('startBet: game is not at init');
        }

        //更新缓存
        scene.status = 'betting';
        sceneCollection.update(scene);


        pushMessages(roomId, scene, 'BetStartEvent', function(err){
            if(!!err){
                return callback({code: Code.COMMON.MSG_FAIL, msg: 'BetStartEvent:  ' + err });
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
                    console.log('################ room: ' + roomId + ', will cancel game');
                }, sceneConfig.durationBet, roomId);
                return callback(null, scene);
            }
        });
    } catch(err){
        return callback(err, null);
    }
}

//玩家下注
SceneService.prototype.playerBet = function(roomId, role, bet, deck, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback({code: Code.SCENE.NO_SCENE, msg: 'playerBet: no scene' });
        }
        if(scene.players[role.token] == null){
            return callback( {code: Code.PLAYER.NO_PLAYER, msg: 'playerBet: player is not inside' });
        }
        if(scene.status != 'betting'){
            return callback( {code: Code.SCENE.NOT_BETTING, msg: 'playerBet: game is not at betting' });
        }

        if(scene.player_bets[role.token] > 0){
            return callback( {code: Code.PLAYER.EXIST_BET, msg: 'playerBet: player already bet' });
        }

        if(bet < 0){
            return callback( {code: Code.PLAYER.NO_BET, msg: 'playerBet: bet can not be less than 0' });
        }

        if(scene.dealer.wealth < bet){
            return callback( {code: Code.SCENE.NO_WEALTH, msg: 'playerBet: broadcaster no enough wealth' });
        }

        // 增加一条 Transaction
        var newTransaction = new Transaction();
        newTransaction.userId = role.token;
        newTransaction.quantity = bet;
        newTransaction.type = 'Bet';
        newTransaction.roomId = roomId;
        newTransaction.sceneId = scene._id.toString();
        newTransaction.save();

        scene.players[role.token] = role;
        scene.player_bets[role.token] = bet;
        scene.dealer_bets += bet;
        scene.dealer.wealth -= bet;
        

        // 下足成功后 为玩家发两张卡牌
        game.dealDefaultCard(deck, function(err, newDeck, card1, card2){

            scene.player_platfroms[role.token].push(card1);
            scene.player_platfroms[role.token].push(card2);
            var newValue = game.calculateHandValue(scene.player_platfroms[role.token]);
            scene.player_values[role.token] = newValue;

            sceneCollection.update(scene);

            var defaultCards = scene.player_platfroms[role.token];

            var msg= {
                isBet: true,
                quantity: bet,
                platfroms: defaultCards,
                values: newValue
            };

            console.log('-------before PlayerBetEvent------------------------');
            console.log(msg);

            pushMessageToPlayers(roomId, {role: role, bet: bet, dealerWealth: scene.dealer.wealth}, 'PlayerBetEvent',function(err){
                console.log('-------after PlayerBetEvent------------------------');
                if(!!err){
                    return callback({code: Code.COMMON.MSG_FAIL, msg: 'PlayerBetEvent: ' + err });
                }
                return callback(null, { isBet: true, quantity: bet, roleWealth: role.wealth, dealerWealth: scene.dealer.wealth, defaultCards: defaultCards, value: newValue });
            });
        });
    }catch(err){
        return callback({code: Code.FAIL, msg: 'playerBet:  error ' + err });
    }
}

//主播开始游戏,并抽一张卡, 并开始玩家抽卡倒计时，倒计时结束调用 玩家抽卡结束
SceneService.prototype.startGame = function(roomId, callback){
    
    	var self = this;
        var scene = sceneCollection.findOne({'room': roomId});
        var betPlayers = Object.keys(scene.player_bets);
        if (!scene) {
            return callback({code: Code.SCENE.NO_SCENE, msg: 'startGame: no scene created yet' });
        }

        //判断已下注玩家数 是否满足游戏开始条件
        if (betPlayers.length < sceneConfig.minPlayerCount){
            return callback({code: Code.SCENE.NO_ENOUGH_PLAYER, msg: 'startGame: no enough player bet' });
        }

        //更新缓存
        scene.status = 'player_started';
        sceneCollection.update(scene);

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
                return callback({code: Code.COMMON.GET_CARD_ERR, msg: 'startGame: get_card_error' });
            }
            pushMessages(roomId, scene, 'GameStartEvent', function(err){
                if(!!err){
                    return callback({code: Code.COMMON.MSG_FAIL, msg: 'GameStartEvent:  ' + err });
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
    
}

//玩家抽卡
SceneService.prototype.playerDraw = function(room_id, token, deck, callback){
    try{
        var scene = sceneCollection.findOne({'room': room_id});

        if(!scene){
            return callback({code: Code.SCENE.NO_SCENE, msg: 'playerDraw: no scene' });
        }
        if(scene.players[token] == null){
            return callback( {code: Code.PLAYER.NO_PLAYER, msg: 'playerDraw: player is not inside' });
        }
        if(scene.status != 'player_started'){
            return callback({code: Code.SCENE.NOT_PLAYER_TURN, msg: 'playerDraw: game is not at player turn' });
        }
        if(scene.player_values[token].busted){
            return callback({code: Code.COMMON.BUSTED, msg: 'playerDraw: busted' });
        }
        game.dealNextCard(deck, function(err, newDeck, card){
            if(err){
                return callback(err);
            }
            try{
                scene.player_platfroms[token].push(card);
                var newValue = game.calculateHandValue(scene.player_platfroms[token]);
                scene.player_values[token] = newValue;
                return callback(null, {newDeck: newDeck, card: card, value: newValue});
            }catch(error){
                return callback( {code: Code.FAIL, msg: 'playerDraw:  error ' + error });
            }
        });
    }catch(err){
        return callback( {code: Code.FAIL, msg: 'playerDraw:  error ' + err });
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
        pushMessageToPlayers(roomId, scene, 'EndPlayerEvent', function(err){
            if(!!err){
                return callback({code: Code.COMMON.MSG_FAIL, msg: 'EndPlayerEvent:  ' + err });
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
            return callback({code: Code.SCENE.NO_SCENE, msg: 'dealerDrawCard: no scene' });
        }
        if(scene.status != 'dealer_turn'){
            return callback({code: Code.SCENE.NOT_DEALER_TURN, msg: 'dealerDrawCard: game is not dealer turn yet' });
        }
        if(scene.dealer_value.busted){
            return callback({code: Code.COMMON.BUSTED, msg: 'busted' });
        }
        game.dealNextCard(scene.dealer_deck, function(err, newDeck, card){
            if(err){
                return callback(err);
            }
            //更新卡组
            
            scene.dealer_platfrom.push(card);
            var newValue = game.calculateHandValue(scene.dealer_platfrom);
            scene.dealer_value = newValue;
            scene.dealer_deck = newDeck;
            sceneCollection.update(scene);

            //推送DealerGetCardEvent 广播主播抽到的卡
            pushMessageToPlayers(roomId, {card: card, value: newValue}, 'DealerGetCardEvent', function(err){
                if(!!err){
                    return callback({code: Code.COMMON.MSG_FAIL, msg: 'DealerGetCardEvent:  ' + err });
                }
                return callback(null, newDeck, card, newValue);
            });
            
        });
    } catch(err){
        return callback({code: Code.FAIL, msg: 'dealNextCard: dealerDrawCard: memdb crash ' + err });
    }
}

//主播结束回合，生成下注排行榜，重置游戏，开始下一回合
SceneService.prototype.dealerFinish = function(roomId, callback){
    
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback({code: Code.SCENE.NO_SCENE, msg: 'dealerFinish: no scene' });
        }
        if(scene.status != 'dealer_turn'){
            return callback({code: Code.SCENE.NOT_DEALER_TURN, msg: 'dealerFinish: game is not dealer turn yet' });
        }
        var player_bets = scene.player_bets;
        var payment = 0;
        var rankingList = [];

        console.log('=======dealerFinish=begin==================')

        var dealerValue = scene.dealer_value;
        var globalRank = scene.rank;

        var group = Object.keys(scene.player_bets).map((uid) => {
            var netValue = bet;

            var bet = player_bets[uid];
            var playValue = scene.player_values[uid];
            var player = scene.players[uid];
            // 计算玩家输赢
            var bunko = game.determinePlayerWin(dealerValue, playValue);

            // 如果玩家的 抽了4张以上直接胜利
            if(scene.player_platfroms[uid].length > 4 && !playValue.busted){
                bunko = 'win'
            }
            // 如果玩家是赢了， 就生成Reward类型Transaction。
            if(bunko == 'win'){
                netValue = bet * sceneConfig.ratio;
                payment += netValue;
                var newTransaction = new Transaction();
                newTransaction.quantity = netValue;
                newTransaction.type = 'Reward';
                newTransaction.roomId = roomId;
                newTransaction.sceneId = scene._id.toString();
                newTransaction.userId = player.token;
                newTransaction.save();
            }else if(bunko == 'tie'){
                netValue = bet;
                payment += netValue;
                var newTransaction = new Transaction();
                newTransaction.quantity = netValue;
                newTransaction.type = 'Tie';
                newTransaction.roomId = roomId;
                newTransaction.sceneId = scene._id.toString();
                newTransaction.userId = player.token;
                newTransaction.save();
            }else if(bunko == 'lose'){
                netValue = 0;
            }
             // 玩家的结果
            var playResult = {
                bunko: bunko,
                quantity: netValue,
                play_value: playValue,
                dealer_value: dealerValue,
                token: player.token
            };

            //将结果存入排行榜
            rankingList.push(playResult);
            console.log(playResult);
        });
        
        //整理排行版
        rankingList.sort(function(resultA, resultB) {
            return resultB.quantity - resultA.quantity;
        });

        console.log('=======dealerFinish=global==================')
        //同步累计排行版
        rankingList.map((current_result) => {
            //查找全局排名中的成绩
            var index = globalRank.findIndex((globol_result) => {
                return globol_result.token == current_result.token;
            });
             
            if(index < 0){
                //如果没有查到 增加一个记录
                globalRank.push(current_result);
            } else{
                //如果查到了修改之
                globalRank[index].quantity = globalRank[index].quantity + current_result.quantity;
            }
        });

        //整理排行版
        globalRank.sort(function(resultA, resultB) {
            return resultB.quantity - resultA.quantity;
        });
        
        scene.rank = globalRank;

        console.log('=======dealerFinish=reset==================')
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
            //TODO: don't push to everyone
            console.log('=======dealerFinish=send msg==================')
            pushMessages(roomId, {rankingList: rankingList, globalRank: globalRank }, 'DealerFinishEvent', function(err){
                if(!!err){
                    console.error(err.msg);
                    return callback({code: Code.COMMON.MSG_FAIL, msg: 'DealerFinishEvent:  ' + err });
                }
                return callback(null, newScene, rankingList, globalRank);
            });
        });
     
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
        //重置玩家列表
        Object.keys(scene.players).map((token) => {
             scene.player_bets[token] = 0;
        });
        sceneCollection.update(scene);

        pushMessages(roomId, scene, 'CancelGameEvent', function(err){
            if(!!err){
                return callback({code: Code.COMMON.MSG_FAIL, msg: 'CancelGameEvent:  ' + err });
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
            console.log('-----sync scene -----------');

            // 保存 scene 到mongodb
            scene.save();

            var nScene = {
                sceneId:        scene._id.toString(),
                roomId:         scene.room,
                turns:          scene.turns,
                player_count:   Object.keys(scene.player_bets).length, // 玩家人数
                payment:        scene.dealer_bets,   // 主播赔付总额
            };

            console.log(nScene);
            // 同步scene 到mysql
            dataSyncService.syncAgainSceneToRemote(nScene, function(err, result){
                if(!!err){
                    return callback(err);
                }
                sceneCollection.remove(scene);
                return callback(null, scene);
            });
        }
    } catch(err){
        return callback('endGame: memDBErr');
    }
}

//获得当前玩家数量
SceneService.prototype.getNumberOfPlayers = function(room_id){
	var scene = sceneCollection.findOne({'room': room_id});
	if(!scene){
		return 0;
	}

	return Object.keys(scene.players).length;
}

//玩家加入游戏
SceneService.prototype.addPlayer = function(roomId, role, serverId, callback){
    try{
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene){
            return callback({code: Code.SCENE.NO_SCENE, msg: 'addPlayer: no scene' });
        }

        // 推送玩家加入游戏消息 (todo:是否有必要推送给所有玩家)
        var channel = channelService.getChannel(roomId, false);
        if(!channel) {
            return callback({code: Code.COMMON.NO_CHANNEL, msg: 'addPlayer: no channel' });
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
        return callback({code: Code.FAIL, msg: 'addPlayer:  error ' + err });
    }
}

//玩家离开游戏
SceneService.prototype.removePlayer = function(roomId, role, serverId, callback){
	try{
        //更新scene
		var scene = sceneCollection.findOne({'room': roomId});
		if(!scene){
            return callback({code: Code.SCENE.NO_SCENE, msg: 'removePlayer: no scene' });
		}
		if(scene.players[role.token] == null){
            return callback({code: Code.PLAYER.NO_PLAYER, msg: 'removePlayer: player is not inside' });
		}
		
		//var player = scene.players[role.token];
		delete scene.players[role.token];

		//var player_platfrom = scene.player_platfroms[role.token];
		delete scene.player_platfroms[role.token];

		//var player_value = scene.player_values[role.token];
		delete scene.player_values[role.token];

		//var player_bet = scene.player_bets[role.token];
		delete scene.player_bets[role.token]; 

		sceneCollection.update(scene);

        var channel = channelService.getChannel(roomId, true);
        if(!channel) {
            return callback('no channel', null);
        }

        //从channel中去除 player 
        channel.leave(role.token, serverId);

        //并推送PlayerLeaveEvent消息
        channel.pushMessage({route: 'PlayerLeaveEvent', role: role});

        return callback(null, 'cleared');
	}
	catch(err){
        return callback({code: Code.FAIL, msg: 'removePlayer:  error ' + err });
	}
}


SceneService.prototype.playerFinish = function(room_id, token, callback){
	
}

// 发送弹幕 并推送 DanmuEvent
SceneService.prototype.sendDanmu = function(roomId, params, callback){
    try{
        pushMessages(roomId, params, 'DanmuEvent', function(err){
            if(!!err){
                return callback({code: Code.COMMON.MSG_FAIL, msg: 'DanmuEvent:  ' + err });
            }
            return callback(null);
        });
    } catch(err){
        callback({code: Code.FAIL, msg: 'DanmuEvent:  ' + err });
    }
}

// 广播送礼 GiftEvent
SceneService.prototype.sendGift = function(roomId, gift, callback){
    try{
        pushMessages(roomId, gift, 'GiftEvent', function(err){
            if(!!err){
                return callback({code: Code.COMMON.MSG_FAIL, msg: 'GiftEvent:  ' + err });
            }
            return callback();
        });
    } catch(err){
        callback({code: Code.FAIL, msg: 'GiftEvent:  ' + err });
    }
}


module.exports = new SceneService();