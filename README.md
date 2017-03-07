#安装说明
```
1.使用npm(node包管理工具)全局安装pomelo:
$ npm install pomelo -g

2.在根目录下，安装依赖包：
$ sh npm-install.sh

3.根目录下启动game-server服务器：
$ cd game-server
$ pomelo start

4.根目录下关闭项目：
$ cd game-server
$ pomelo stop

5.主播测试客户端web版本
$ cd web-broadcaster-client
$ node app.js

5.玩家测试客户端web版本
$ cd web-player-client
$ node app.js

```

# errorCode 说明
 200,   // 成功得到结果
 500,   // 其他错误
 1001,  // token 不存在
 1002,  // token 过期
 1003,  // 用户不存在
 1004,  // 主播认证失败或者不存在
 2001,  // 服务不可用
 3001,  // 场景不存在
 3002,  // 主播财富值不够
 3003,  // 游戏不是init状态
 3004,  // 不是下注状态
 3005,  // 不是玩家回合
 3006,  // 不是玩家回合
 3007,  // 找不到卡组
 3008,  // 找不到主播
 3009,  // 创建游戏出错
 3010,  // 下注玩家不够
 4001,  // 游戏中不存在当前玩家
 4002,  // 玩家未下赌注或者赌注为零
 4003,  // 玩家已经下过注了
 4004,  // 玩家财富值不够
 4005,  // 玩家找不到卡组
 5001,  // 操作内存数据库异常
 5002,  // 缺少参数
 5003,  // 查卡抽爆掉了
 5004,  // 无卡可抽
 5005,  // 找不到channel
 5006,  // 发送消息失败
 5007,  //抽卡报错


# 状态机说明
```
 init--->(BetStartEvent)--->betting--->(GameStartEvent)--->player_started--->(EndPlayerEvent)--->dealer_turn--->(DealerFinishEvent)--->init
```

# 主播端接口说明

## 1. 主播登陆 (包括主播断开游戏重新连接)

```
  route:  broadcaster.entryHandler.entry
  
   参数:  { roomId: XXXXXX }
    
  成功返回值: { code: 200, result: {broadcaster object}  }
  
  失败返回值: { code: errorCode, result: errMsg }
  
```

## 2. 主播创建游戏

```
  route:  scene.sceneHandler.createGame
  
   参数:  无
    
  成功返回值: { code: 200, result: {scene object}  }
  
  失败返回值: { code: errorCode, result: errMsg }
  
```

## 3. 主播通知下注

```
    route:  scene.sceneHandler.startBet

    参数:  无

    成功返回值: { code: 200, result: {scene object}  }

    失败返回值: { code: errorCode, result: errMsg }

```

## 4. 主播开始游戏

```
  route:  scene.sceneHandler.startGame
  
   参数:  无
    
  成功返回值: { code: 200, result: {scene object}  }
  
  失败返回值: { code: errorCode, result: errMsg }
  
```

## 5. 主播抽卡

```
  route:  scene.sceneHandler.dealerDrawCard
  
   参数:  无
    
  成功返回值: { code: 200, result: { 
                                    newDeck: { deck object }, 
                                    newCard: { card object }, 
                                    newValue:{ cardValue object }
                                  }  
            }
  
  失败返回值: { code: errorCode, result: errMsg }
  
```

## 6. 主播结束抽卡

```
  route:  scene.sceneHandler.dealerFinish
  
   参数:  无
    
  成功返回值: { code: 200, result: {scene object}  }
  
  失败返回值: { code: errorCode, result: errMsg }
  
```

## 7. 主播结束游戏

```
  route:  scene.sceneHandler.endGame
  
   参数:  无
    
  成功返回值: { code: 200, result: {scene object}  }
  
  失败返回值: { code: errorCode, result: errMsg }
  
```

# 主播端推送事件说明

## 1. 主播进入游戏

```
  Event:  DealerEnterEvent
    
  推送数据: { dealer object }
  
```

## 2. 主播离开游戏

```
  Event:  DealerLeaveEvent
    
  推送数据: { dealer object }
  
```
## 3. 开始下注

```
Event:  BetStartEvent

推送数据: { scene object }

```
## 4. 游戏开始

```
  Event:  GameStartEvent
    
  推送数据: { scene object }
  
```

## 5. 主播抽卡(抽一次发一次)

```
  Event:  DealerGetCardEvent
    
  推送数据: { card object }
  
```

## 6. 主播结束抽卡

```
  Event:  DealerFinishEvent
    
  推送数据: { scene object }
  
```

## 7. 结束游戏

```
  Event:  GameOverEvent
    
  推送数据: { scene object }
```


# 玩家端接口说明

## 1.玩家登陆 

```
  route:  connector.entryHandler.entry
  
   参数:  { room: XXXXXX, 
            token: xxxxxxx     }
    
  成功返回值: { code: 200, result: { scene object }  }
  
  失败返回值: { code: errorCode, result: errMsg }
  
```

## 2.玩家退出游戏接口 

```
  route:  connector.roleHandler.leave
  
   参数:   无
   
  成功返回值: { code: 200 , result: 'cleared' }
  失败返回值: { code: errorCode, result: errMsg }
  

```

## 3.玩家下注接口 

```
  route:  connector.roleHandler.bet
  
   参数:   { bet: 50  }  玩家下注金额，要求：bet > 0
    
  成功返回值: { code: 200 ,
               result:  {  isBet: true,  //是否下注 true | false
                           quantity: 50,   //下注金额
                           roleWealth: 350,  // 玩家余额
                           dealerWealth: 98234, //  主播余额
                           defaultCards: [card1,card2],   //卡组信息
                           value: {value: 18, busted: false, numberOfHigh: 35 numberOfTrans: 0}  // 玩家当前卡点数 
               } 
             }
  失败返回值: { code: errorCode, result: errMsg }
  
```


## 4.玩家抽卡接口 

```
  route:  connector.roleHandler.draw
  
   参数:  无
    
  成功返回值: { code: 200 ,
               result:  { 
                      card: { card object },  // 玩家抽到的卡情况
                      value: { value: 18, busted: false, numberOfHigh: 35 numberOfTrans: 0 },  //玩家当前卡点数
                      remain: 3  //已抽卡数量
                  } 
             }
  失败返回值: { code: errorCode, result: errMsg }
  
```


# 玩家端推送事件说明

## 1. 玩家进入游戏

```
  Event:  PlayerEnterEvent
    
  推送数据: { role object }
  
  推送对象：所有人
  
```

## 2. 玩家下注

```
  Event:  PlayerBetEvent
    
  推送数据: {role: role, bet: bet, dealer_wealth: scene.dealer.wealth }
  
  推送对象：所有人
  
```

# 调用到的php接口

## 获取主播基本信息

```  
  method: 'GET',
  url: host + '/api/broadcaster/' + roomId,
  headers: headers["X_MCV_TOKEN"] = "d858bd235c7faf19f5da18a1118788e2";
    
  result: { broadcaster object}
  
```

## 获取玩家基本信息

```  
  method: 'GET',
  url: host + '/api/broadcaster/' + roomId,
  headers: headers["X_MCV_TOKEN"] = "d858bd235c7faf19f5da18a1118788e2";
    
  result: { broadcaster object}
  
```

"userGet": "/api/account",
	    	"broadcasterGet": "/api/broadcasters",
            'scenePost': "/api/scenes",
            'transactionPost': "/api/transactions"

room: scene.room,
            turns: scene.turns,
            player_count: Object.keys(scene.player_bets).length, // 玩家人数
            bet_amount: scene.dealer_bets,  // 玩家下注总额
            payment: scene.dealer_bets,   // 主播赔付总额
            profit: scene.dealer_bets-scene.dealer_bets, //主播赢的总额
            started_at: scene.started_at,   // 回合开始时间
            finished_at: getDateTime() // 回合结束时间

  



