var Scene = require('../models/scene');
var Transaction = require('../models/transaction');

var moment = require('moment');

var game = require('../console/game');
var utils = require('../util/utils');
var sceneConstructor = require('../util/sceneConstructor');

var channelService = app.get('channelService');
var dataSyncService = require('./dataSync');
var transactionService = require('./transaction');
var pushService = require('./push');

var sceneConfig = require('../../config/scene');
var async = require('async');

//初始化游戏信息
function initScene(roomId, dealer, callback){
    var self = this;
    console.log('-----init Scene:' +  roomId + '-----------');
    //初始化游戏场景
    var newScene = new Scene();          //+
    newScene.room = roomId;              //+              
    newScene.status = 'init';            //+
    newScene.started_at = utils.getCurrentDate(); //+游戏创建时间
    //初始化玩家列表
    newScene.players = {};               //-             
    newScene.player_platfroms = {};      //- 
    newScene.player_values = {};         //- 
    newScene.player_bets = {};           //-
    //初始化主播信息
    newScene.dealer = dealer;            //+
    newScene.dealer_platfrom = [];       //+
    newScene.dealer_value = {value: 0, busted: false, numberOfHigh: 0}; //+
	newScene.dealer_bets = 0;            //+ 主播冻结金额，等于 玩家下注总金额
	newScene.dealer_deck = [];           //-
	newScene.turns = 0;                  //+
    //初始化计时器信息
    newScene.durationBet = sceneConfig.durationBet;               //+
    newScene.durationPlayerTurn = sceneConfig.durationPlayerTurn; //+
    newScene.durationDealerTurn = sceneConfig.durationDealerTurn; //+
    //初始化排行
    newScene.rank = [];                                           //-

    //当前状态时间
    newScene.current_status_time = utils.getCurrentDate();        //+游戏状态更新时间

	//创建主播卡组
    var deckId = 'default';
    var newDeck = utils.createDeck(deckId);
    if(!newDeck){
        return callback('dealer deck could not be created');
    }
    newScene.dealer_deck = newDeck;
    newScene.save();
    return callback(null, newScene);
}

//重置游戏信息
function resetScene(scene, callback){
    console.log('-----reset Scene:' + '-----------');
    //回合加一
    scene.turns = scene.turns + 1;
    scene.status = 'init';
    scene.current_status_time = utils.getCurrentDate(); 
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
    scene.dealer_bets = 0;
    scene.player_bets = {};
    //创建主播卡组
    var deckId = 'default';
    var newDeck = utils.createDeck(deckId);
    if(!newDeck){
        return callback('dealer deck could not be created');
    }
    scene.dealer_deck = newDeck;
    // 保存 scene 到mongodb
    scene.save();
    return callback(null, scene);
}

function SceneService() {
}

//主播创建游戏
SceneService.prototype.createGame = function(dealer, roomId, callback) {
	var scene = sceneCollection.findOne({'room': roomId});
    //主播 非主观意图断开游戏，重新加入
    if(scene){
        //游戏已经创建，直接返回
        return callback(null, sceneConstructor.make(scene));
    } else{
        //初始化游戏场景
        initScene(roomId, dealer, function(err, newScene){
            if (!!err) {
                return callback({code: Code.SCENE.CREATE_ERR, msg: 'createGame: ' + err});
            }
            //更新缓存
            sceneCollection.insert(newScene);

            //同步到远程
            dataSyncService.syncSceneToRemote({sceneId: newScene._id.toString(), roomId: roomId}, function(err, result){
                if(!!err){
                    return callback(err);
                }
                return callback(null, sceneConstructor.make(newScene));
            });
        });
    }
}


//主播通知开始下注，并开始下注倒计时，
SceneService.prototype.startBet = function(roomId, callback){
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
    scene.current_status_time = utils.getCurrentDate(); 
    sceneCollection.update(scene);
    pushService.pushMessages(roomId, sceneConstructor.make(scene), 'BetStartEvent', function(err){
        if(!!err){
            return callback({code: Code.COMMON.MSG_FAIL, msg: 'BetStartEvent:  ' + err });
        }
        else{
            //开启计时器
            var current_turn = scene.turns;
            setTimeout(function(roomId) {
                var scene = sceneCollection.findOne({'room': roomId});
                if(!scene || scene.status != 'betting' || current_turn != scene.turns){
                    return;
                }
                self.cancelGame(roomId, function(err, result){
                });
                console.log('################ room: ' + roomId + ', will cancel game');
            }, sceneConfig.durationBet, roomId);
            return callback(null, sceneConstructor.make(scene));
        }
    });
}

//玩家下注
SceneService.prototype.playerBet = function(roomId, role, bet, deck, callback){
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
    transactionService.append({ userId: role.token, quantity: bet, type: 'Bet', roomId: roomId, sceneId: scene._id.toString() });

    scene.players[role.token] = role;
    scene.player_bets[role.token] = bet;
    scene.dealer_bets += bet;
    
    // 下足成功后 为玩家发两张卡牌
    game.dealDefaultCard(deck, function(err, newDeck, card1, card2){
        if(!!err){
            return callback(err);  
        }
        if(!!card1){
            scene.player_platfroms[role.token].push(card1);
        }
         if(!!card2){
            scene.player_platfroms[role.token].push(card2);
        }
        
        var newValue = game.calculateHandValue(scene.player_platfroms[role.token]);
        scene.player_values[role.token] = newValue;
        sceneCollection.update(scene);
        var defaultCards = scene.player_platfroms[role.token];
        
        console.log('-------before PlayerBetEvent------------------------');

        //通知zhubo
        var numOfPlayers = Object.keys(scene.player_bets).filter((key) => {
            return scene.player_bets[key] > 0;
        }).length;
        pushService.pushMessageToDealer(roomId, { 
                                            totalPlayers: numOfPlayers,
                                           	totalBet: scene.dealer_bets
                                         }, 'PlayerBetEvent');
        
        return callback(null, { newDeck: newDeck, isBet: true, quantity: bet, roleWealth: role.wealth, dealerWealth: scene.dealer.wealth, defaultCards: defaultCards, value: newValue });
    }); 
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
    scene.current_status_time = utils.getCurrentDate(); 
    sceneCollection.update(scene);
    //加入随机的卡
    game.dealNextCard(scene.dealer_deck, function(err, newDeck, card){
        if(err){
            return callback(err);
        }
        scene.dealer_platfrom.push(card);
        var newValue = game.calculateHandValue(scene.dealer_platfrom);
        scene.dealer_value = newValue;
        scene.dealer_deck = newDeck;
        sceneCollection.update(scene);
        
        //开启计时器
        var current_turn = scene.turns;
        setTimeout(function(roomId) {
            var scene = sceneCollection.findOne({'room': roomId});
            if(!scene || scene.status != 'player_started' || current_turn != scene.turns){
                return;
            }
            self.endPlayerTurn(roomId, function(err, result){
            });
            console.log('################ room: ' + roomId + ', will end players turn');
        }, sceneConfig.durationPlayerTurn, roomId);
        
        //通知其他观众
        pushService.pushMessages(roomId, { 
                                            dealer_platfrom: scene.dealer_platfrom, 
                                            dealer_value: scene.dealer_value, 
                                            dealer: scene.dealer, status: scene.status
                                         }, 'GameStartEvent');
        return callback(null, sceneConstructor.make(scene));
    });
}

//玩家抽卡
SceneService.prototype.playerDraw = function(room_id, token, deck, callback){
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
        scene.player_platfroms[token].push(card);
        var newValue = game.calculateHandValue(scene.player_platfroms[token]);
        scene.player_values[token] = newValue;
        return callback(null, {newDeck: newDeck, card: card, value: newValue});
    });
}

//玩家抽卡结束, 并开始主播抽卡倒计时，时间到调用 主播结束回合
SceneService.prototype.endPlayerTurn = function(roomId, callback){
    var self = this;
    var scene = sceneCollection.findOne({'room': roomId});
    if (!scene) {
        return callback('startGame: no scene created yet');
    }
    if (scene.status != 'player_started') {
        return callback('game is not at player turn');
    }
    scene.status = 'dealer_turn';
    scene.current_status_time = utils.getCurrentDate(); 
    sceneCollection.update(scene);
   
    //开启倒计时
    var current_turn = scene.turns;
    setTimeout(function(roomId) {
        var scene = sceneCollection.findOne({'room': roomId});
        if(!scene || scene.status != 'dealer_turn' || current_turn != scene.turns){
            return;
        }
        console.log('################ room: ' + roomId + ', will end dealer turn, into dealerFinish ');
        self.dealerFinish(roomId, function(err, result){});
    }, sceneConfig.durationDealerTurn, roomId);

    //通知所有玩家
    pushService.pushMessageToPlayers(roomId, sceneConstructor.make(scene), 'EndPlayerEvent');

    return callback(null, sceneConstructor.make(scene));
}

//主播抽卡
SceneService.prototype.dealerDrawCard = function(roomId, callback){
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
        if(!!err){
            return callback(err);
        }
        //更新卡组
        scene.dealer_platfrom.push(card);
        var newValue = game.calculateHandValue(scene.dealer_platfrom);
        scene.dealer_value = newValue;
        scene.dealer_deck = newDeck;
        sceneCollection.update(scene);
        //推送DealerGetCardEvent 广播主播抽到的卡
        pushService.pushMessageToPlayers(roomId, {card: card, value: newValue}, 'DealerGetCardEvent'); 
        return callback(null, newDeck, card, newValue);
    });
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
        var bet = player_bets[uid];
        if(bet <= 0){
            return;
        }
        var netValue = 0;
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
            transactionService.append({ userId: player.token, quantity: netValue, type: 'Reward', roomId: roomId, sceneId: scene._id.toString() });
        }else if(bunko == 'tie'){
            netValue = bet;
            payment += netValue;
            transactionService.append({ userId: player.token, quantity: netValue, type: 'Reward', roomId: roomId, sceneId: scene._id.toString() });
        }else if(bunko == 'lose'){
            netValue = 0;
        }
        // 玩家的结果
        var playResult = {
            bunko: bunko,
            quantity: netValue,
            play_value: playValue,
            //dealer_value: dealerValue,
            token: player.token,
            name: player.name,
            benifit: netValue - bet
        };

        //更新用户缓存
        scene.players[uid].wealth += (netValue - bet);
        if(bunko == 'win'){
            scene.players[uid].intimacy += bet;
        }
        scene.players[uid].exp += bet;

        //更新主播缓存
        scene.dealer.wealth -= (netValue - bet);
        
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
        console.log('=======dealerFinish=send msg==================')
        var transactionList = transactionService.fetch();
        transactionService.deleteAll(transactionList);
        
        //同步缓存
        sceneCollection.update(newScene);

        //同步远程
        dataSyncService.syncTransactionToRemote(transactionList, function(err, result){
            pushService.pushMessages(roomId, { rankingList: rankingList, globalRank: globalRank }, 'DealerFinishEvent');
            if(!!err){
                console.error(err.msg);
                return callback({code: Code.COMMON.MSG_FAIL, msg: 'DealerFinishEvent:  ' + err });
            }
            return callback(null, sceneConstructor.make(newScene), rankingList, globalRank);
        });
    }); 
}

//主播取消游戏
SceneService.prototype.cancelGame = function(roomId, callback){
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
        scene.player_platfroms[token] = [];
    });
    scene.dealer_bets = 0;
    sceneCollection.update(scene);

    //清空transaction
    var transactionList = transactionService.fetch();
    transactionService.deleteAll(transactionList);
    
    pushService.pushMessages(roomId, sceneConstructor.make(scene), 'CancelGameEvent');
    return callback(null, sceneConstructor.make(scene));
}

//游戏结束
SceneService.prototype.endGame = function(roomId, callback) {
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
        };
        console.log(nScene);
        // 同步scene 到mysql
        dataSyncService.syncAgainSceneToRemote(nScene, function(err, result){
            if(!!err){
                return callback(err);
            }
            sceneCollection.remove(scene);
            pushService.pushMessages(roomId, role, 'DealerLeaveEvent');
            return callback(null, sceneConstructor.make(scene));
        });
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
    var scene = sceneCollection.findOne({'room': roomId});

    if(!scene){
        return callback({code: Code.SCENE.NO_SCENE, msg: 'addPlayer: no scene' });
    }
    // 推送玩家加入游戏消息 (todo:是否有必要推送给所有玩家) 
    pushService.pushMessages(roomId, role, 'PlayerEnterEvent');
    
    //TODO: 游戏人数不够的话

    
    
    //如果玩家已加入游戏， 返回当前游戏状态
    console.log('@@@@@@@ add player into cache');
    if(scene.players[role.token] != null){
        console.log('@@@@@@@ already in the cache');
        scene.timeElapse = seconds;
        return callback(null, scene);
    }
    //否则创建新的玩家状态
    role.sid = serverId;
    scene.players[role.token] = role;
    scene.player_platfroms[role.token] = [];
    scene.player_values[role.token] = {value: 0, busted: false, numberOfHigh: 0};
    scene.player_bets[role.token] = 0;
    sceneCollection.update(scene);

    //加入广播组
    var channel = channelService.getChannel(roomId, false);
    if(!channel) {
        return callback({code: Code.COMMON.NO_CHANNEL, msg: 'addPlayer: no channel' });
    }
    channel.add(role.token, serverId);
    
    //计算剩余时间
    var startDate = moment(scene.current_status_time);
    var endDate = moment(utils.getCurrentDate());
    var secondsDiff = endDate.diff(startDate, 'seconds');
    var seconds = moment(utils.getCurrentDate()).diff(scene.current_status_time, 'seconds');
    scene.timeElapse = seconds;
    return callback(null, scene);
}

//玩家离开游戏
SceneService.prototype.removePlayer = function(roomId, role, serverId, callback){
	//更新scene
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback({code: Code.SCENE.NO_SCENE, msg: 'removePlayer: no scene' });
    }
    if(scene.players[role.token] == null){
        return callback({code: Code.PLAYER.NO_PLAYER, msg: 'removePlayer: player is not inside' });
    }
    delete scene.players[role.token];
    delete scene.player_platfroms[role.token];
    delete scene.player_values[role.token];
    delete scene.player_bets[role.token]; 
    sceneCollection.update(scene);
    
    //并推送PlayerLeaveEvent消息
    var channel = channelService.getChannel(roomId, true);
    if(!channel) {
        return callback('no channel', null);
    }
    channel.pushMessage({route: 'PlayerLeaveEvent', role: role});
    //从channel中去除 player sc
    channel.leave(role.token, serverId);
    
    return callback(null, 'cleared');
}


SceneService.prototype.playerFinish = function(room_id, token, callback){

}

// 发送弹幕 并推送 DanmuEvent
SceneService.prototype.sendDanmu = function(roomId, params, callback){
    pushService.pushMessages(roomId, params, 'DanmuEvent');
    return callback();
} 


// 广播送礼 GiftEvent
SceneService.prototype.sendGift = function(roomId, gift, role, callback){
    pushService.pushMessages(roomId, gift, 'GiftEvent');

    //更新缓存
    var scene = sceneCollection.findOne({'room': roomId});
    //scene.dealer.wealth -= gift.value
    if(!scene.players[role.token]){
        return callback({code: Code.PLAYER.NO_PLAYER, msg: 'removePlayer: player is not inside' });
    }
    scene.players[role.token] = role;
    sceneCollection.update(scene);;
    
    return callback(null, role.wealth);
}

// 人脸识别
SceneService.prototype.updateCoor = function(roomId, params, callback){
    pushService.pushMessageToPlayers(roomId, params, 'UpdateCoorEvent', function(err){
        if(!!err){
            return callback({code: Code.COMMON.MSG_FAIL, msg: 'UpdateCoorEvent:  ' + err });
        }
        return callback();
    });
}

module.exports = new SceneService();