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
var roleService = require('./role');

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
    var storedRoles = roleService.getAll(scene.room);
    storedRoles.map((aRole) => {
        roleService.resetGameInfo(aRole);
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
    if(bet < 0){
        return callback( {code: Code.PLAYER.NO_BET, msg: 'playerBet: bet can not be less than 0' });
    }

    //find the player
    var storedRole = roleService.getOne(role, roomId);
    if(storedRole.inGame){
        return callback( {code: Code.PLAYER.EXIST_BET, msg: 'playerBet: player already bet' });
    }

    //find the scene
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback({code: Code.SCENE.NO_SCENE, msg: 'playerBet: no scene' });
    }
    if(scene.status != 'betting'){
        return callback( {code: Code.SCENE.NOT_BETTING, msg: 'playerBet: game is not at betting' });
    }
    if(scene.dealer.wealth < bet){
        return callback( {code: Code.SCENE.NO_WEALTH, msg: 'playerBet: broadcaster no enough wealth' });
    }

    
    
    // 增加一条 Transaction
    transactionService.append({ userId: role.token, quantity: bet, type: 'Bet', roomId: roomId, sceneId: scene._id.toString() });

    //update player cache
    storedRole.player_bet = bet;
    storedRole.inGame = true;
    storedRole,wealth = role.wealth;
    storedRole.intimacy = role.intimacy;
    storedRole.exp = role.exp;
    storedRole.withdraw_gift_number = role.withdraw_gift_number;
    roleService.update(storedRole);
    
    //update scene cache
    scene.dealer_bets += bet;
    sceneCollection.update(scene);
    
    // 下足成功后 为玩家发两张卡牌
    game.dealDefaultCard(deck, function(err, newDeck, card1, card2){
        if(!!err){
            return callback(err);  
        }
        if(!!card1){
            storedRole.player_platfrom.push(card1);
        }
         if(!!card2){
            storedRole.player_platfrom.push(card2);
        }
        var newValue = game.calculateHandValue(storedRole.player_platfrom);
        storedRole.player_value = newValue;

        //update player cache after drawcard
        roleService.update(storedRole);
        
        //通知zhubo
        var numOfPlayers = roleService.getAllInGame(roomId).length;
        pushService.pushMessageToDealer(roomId, { 
                                            totalPlayers: numOfPlayers,
                                           	totalBet: scene.dealer_bets
                                         }, 'PlayerBetEvent', function(err, result){});
        
        var defaultCards = storedRole.player_platfrom;
        return callback(null, { newDeck: newDeck, isBet: true, quantity: bet, roleWealth: role.wealth, dealerWealth: scene.dealer.wealth, defaultCards: defaultCards, value: newValue });
    }); 
}

//主播开始游戏,并抽一张卡, 并开始玩家抽卡倒计时，倒计时结束调用 玩家抽卡结束
SceneService.prototype.startGame = function(roomId, callback){
    var self = this;

    //查找scene
    var scene = sceneCollection.findOne({'room': roomId});
    if (!scene) {
        return callback({code: Code.SCENE.NO_SCENE, msg: 'startGame: no scene created yet' });
    }

    //查找players
    var storedRoles = roleService.getAllInGame(roomId);
    if (storedRoles.length < sceneConfig.minPlayerCount){
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
        pushService.pushMessageToPlayers(roomId, { 
                                            dealer_platfrom: scene.dealer_platfrom, 
                                            dealer_value: scene.dealer_value, 
                                            dealer: scene.dealer, status: scene.status
                                         }, 'GameStartEvent', function(err, result){});
        return callback(null, sceneConstructor.make(scene));
    });
}

//玩家抽卡
SceneService.prototype.playerDraw = function(roomId, token, deck, callback){
    //find the scene
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback({code: Code.SCENE.NO_SCENE, msg: 'playerDraw: no scene' });
    }
    if(scene.status != 'player_started'){
        return callback({code: Code.SCENE.NOT_PLAYER_TURN, msg: 'playerDraw: game is not at player turn' });
    }

    //find the player
    var storedRole = roleService.getOneInGame({token: token}, roomId);
    if(storedRole == null){
        return callback( {code: Code.PLAYER.NO_PLAYER, msg: 'playerDraw: player is not inside' });
    }
    if(storedRole.player_value.busted){
        return callback({code: Code.COMMON.BUSTED, msg: 'playerDraw: busted' });
    }

    //begin drawing
    game.dealNextCard(deck, function(err, newDeck, card){
        if(err){
            return callback(err);
        }
        storedRole.player_platfrom.push(card);
        var newValue = game.calculateHandValue(storedRole.player_platfrom);
        storedRole.player_value = newValue;
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
    pushService.pushMessageToPlayers(roomId, sceneConstructor.make(scene), 'EndPlayerEvent', function(err, result){});

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
        pushService.pushMessageToPlayers(roomId, {card: card, value: newValue}, 'DealerGetCardEvent', function(err, result){}); 
        return callback(null, newDeck, card, newValue);
    });
}

//主播结束回合，生成下注排行榜，重置游戏，开始下一回合
SceneService.prototype.dealerFinish = function(roomId, callback){
    //查找scene
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback({code: Code.SCENE.NO_SCENE, msg: 'dealerFinish: no scene' });
    }
    if(scene.status != 'dealer_turn'){
        return callback({code: Code.SCENE.NOT_DEALER_TURN, msg: 'dealerFinish: game is not dealer turn yet' });
    }

    //查找玩家群
    players = roleService.getAllInGame(roomId);

    //初始化临时数据
    var payment = 0;
    var rankingList = [];

    console.log('=======dealerFinish=begin==================')
    var dealerValue = scene.dealer_value;
    var globalRank = scene.rank;
    var group = players.map((aPlayer) => {
        var bet = aPlayer.player_bet;
        var netValue = 0;
        var playValue = aPlayer.player_value;
       
        // 计算玩家输赢
        var bunko = game.determinePlayerWin(dealerValue, playValue);
        
        // 如果玩家的 抽了4张以上直接胜利
        if(aPlayer.player_platfrom.length > 4 && !playValue.busted){
            bunko = 'win'
        }
        // 如果玩家是赢了， 就生成Reward类型Transaction。
        if(bunko == 'win'){
            netValue = bet * sceneConfig.ratio;
            payment += netValue; 
            transactionService.append({ userId: aPlayer.token, quantity: netValue, type: 'Reward', roomId: roomId, sceneId: scene._id.toString() });
        }else if(bunko == 'tie'){
            netValue = bet;
            payment += netValue;
            transactionService.append({ userId: aPlayer.token, quantity: netValue, type: 'Reward', roomId: roomId, sceneId: scene._id.toString() });
        }else if(bunko == 'lose'){
            netValue = 0;
        }
        // 玩家的结果
        var playResult = {
            bunko: bunko,
            quantity: netValue,
            play_value: playValue,
            //dealer_value: dealerValue,
            token: aPlayer.token,
            name: aPlayer.name,
            benifit: netValue - bet
        };

        //更新用户缓存
        aPlayer.inGame = false;
        aPlayer.wealth += (netValue - bet);
        if(bunko == 'win'){
            aPlayer.intimacy += bet;
        }
        aPlayer.exp += bet;
        roleService.update(aPlayer);

        //更新主播
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

    //重置游戏 更新游戏状态
    console.log('=======dealerFinish=reset==================')
    resetScene(scene, function(err, newScene){
        if(err){
            return callback(err);
        }
        var transactionList = transactionService.fetch();
        transactionService.deleteAll(transactionList);
        
        //同步scene缓存
        sceneCollection.update(newScene);

        //同步远程
        dataSyncService.syncTransactionToRemote(transactionList, function(err, result){
            pushService.pushMessages(roomId, { rankingList: rankingList, globalRank: globalRank }, 'DealerFinishEvent', function(err, result){});
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

    //发送消息
    pushService.pushMessages(roomId, {}, 'CancelGameEvent', function(err, result){});

    //更新游戏状态
    scene.status = 'init';
    scene.dealer_bets = 0;
    sceneCollection.update(scene);

    //重置玩家列表
    roleService.getAllInGame(roomId).map((storedRole) => {
        roleService.resetGameInfo(storedRole);
    });

    //清空transaction
    var transactionList = transactionService.fetch();
    transactionService.deleteAll(transactionList);
    
    return callback(null, sceneConstructor.make(scene));
}

//游戏结束
SceneService.prototype.endGame = function(roomId, callback) {
    //find scene
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback('game not exist', scene);
    } 
    //find players
    var storedRoles = roleService.getAll(roomId);
    
    console.log('-----sync scene -----------');
    // 保存 scene 到mongodb
    scene.save();
    var nScene = {
        sceneId:        scene._id.toString(),
        roomId:         scene.room,
        turns:          scene.turns,
        player_count:   storedRoles.length, // 玩家人数
    };
    console.log(nScene);

    //清理数据
    sceneCollection.remove(scene);
    roleService.removeArrayFromCache(storedRoles);

    // 同步scene 到mysql
    dataSyncService.syncAgainSceneToRemote(nScene, function(err, result){
        if(!!err){
            return callback(err);
        }
        
        pushService.pushMessages(roomId, sceneConstructor.make(scene), 'DealerLeaveEvent', function(err, result){});
        return callback(null, sceneConstructor.make(scene));
    });
    
}

//获得当前玩家数量
SceneService.prototype.getNumberOfPlayers = function(roomId){
	return roleService.getAll(roomId).length;
}

//玩家加入游戏
SceneService.prototype.addPlayer = function(roomId, role, serverId, callback){
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback({code: Code.SCENE.NO_SCENE, msg: 'addPlayer: no scene' });
    }
    // 推送玩家加入游戏消息 (todo:是否有必要推送给所有玩家) 
    pushService.pushMessageToDealer(roomId, role, 'PlayerEnterEvent', function(err, result){});
    
    //TODO: 游戏人数不够的话
    
    //如果玩家已加入游戏， 返回当前游戏状态
    var storedRole = roleService.getOne(role, roomId);
    if(!!storedRole){
        console.log('@@@@@@@ already in the cache');
        scene.timeElapse = seconds;
        return callback(null, scene, storedRole);
    }
    
    //否则创建新的玩家状态并写入缓存
    console.log('@@@@@@@ add player into cache');
    role.room = roomId;
    role.sid = serverId;
    role = roleService.initGameInfo(role); 
    //加入广播组
    //var channel = channelService.getChannel(roomId, false);
    //if(!channel) {
     //   return callback({code: Code.COMMON.NO_CHANNEL, msg: 'addPlayer: no channel' });
    //}
    //channel.add(role.token, serverId);
    
    //计算剩余时间
    var startDate = moment(scene.current_status_time);
    var endDate = moment(utils.getCurrentDate());
    var secondsDiff = endDate.diff(startDate, 'seconds');
    var seconds = moment(utils.getCurrentDate()).diff(scene.current_status_time, 'seconds');
    scene.timeElapse = seconds;
    return callback(null, scene, role);
}

//玩家离开游戏
SceneService.prototype.removePlayer = function(roomId, role, serverId, callback){
	//查找scene
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback({code: Code.SCENE.NO_SCENE, msg: 'removePlayer: no scene' });
    }

    //查找玩家
    var storedRole = roleService.getOne(role, roomId);
    if(!storedRole){
        return callback({code: Code.PLAYER.NO_PLAYER, msg: 'removePlayer: player is not inside' });
    }

    //移除玩家
    roleService.removeFromCache(storedRole);
    
    //并推送PlayerLeaveEvent消息
    //var channel = channelService.getChannel(roomId, true);
    //if(!channel) {
        //return callback('no channel', null);
    //}
    //channel.pushMessage({route: 'PlayerLeaveEvent', role: role});
    //从channel中去除 player sc
    //channel.leave(role.token, serverId);
    
    return callback(null, 'cleared');
}


SceneService.prototype.playerFinish = function(room_id, token, callback){

}

// 发送弹幕 并推送 DanmuEvent
SceneService.prototype.sendDanmu = function(roomId, params, callback){
    pushService.pushMessages(roomId, params, 'DanmuEvent', function(err, result){});
    return callback();
} 


// 广播送礼 GiftEvent
SceneService.prototype.sendGift = function(roomId, gift, role, callback){
    pushService.pushMessages(roomId, gift, 'GiftEvent', function(err, result){});

    //更新房间
    var scene = sceneCollection.findOne({'room': roomId});
    if(!scene){
        return callback({code: Code.SCENE.NO_SCENE, msg: 'sendGift: no scene' });
    }
    scene.dealer.wealth += gift.value;
    sceneCollection.update(scene);
    /*if(!scene.players[role.token]){
        return callback({code: Code.PLAYER.NO_PLAYER, msg: 'removePlayer: player is not inside' });
    }
    scene.players[role.token] = role;
    sceneCollection.update(scene);*/

    //更新玩家
    var storedRole = roleService.getOne(role, roomId);
    if(!storedRole){
        return callback({code: Code.PLAYER.NO_PLAYER, msg: 'sendGift: player is not inside' });
    }
    storedRole.wealth -= gift.value;
    storedRole.intimacy = role.intimacy;
    storedRole.withdraw_gift_number = role.withdraw_gift_number;
    roleService.update(storedRole);
    
    return callback(null, role.wealth, role.withdraw_gift_number);
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