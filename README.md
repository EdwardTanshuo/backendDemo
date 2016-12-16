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
```


# 主播端接口说明

## 1. 主播登陆 (包括主播断开游戏重新连接)

```
  route:  broadcaster.entryHandler.entry
  
   参数:  { roomId: XXXXXX }
    
  成功返回值: { code: 200, result: {broadcaster object}  }
  
  失败返回值: { code: 500, error: errMsg }
  
```

## 2. 主播创建游戏

```
  route:  scene.sceneHandler.createGame
  
   参数:  无
    
  成功返回值: { code: 200, result: {scene object}  }
  
  失败返回值: { code: 500, error: errMsg }
  
```

## 3. 主播开始游戏

```
  route:  scene.sceneHandler.startGame
  
   参数:  无
    
  成功返回值: { code: 200, result: {scene object}  }
  
  失败返回值: { code: 500, error: errMsg }
  
```

## 4. 主播抽卡

```
  route:  scene.sceneHandler.dealerDrawCard
  
   参数:  无
    
  成功返回值: { code: 200, result: { 
                                    newDeck: { deck object }, 
                                    newCard: { card object }, 
                                    newValue:{ cardValue object }
                                  }  
            }
  
  失败返回值: { code: 500, error: errMsg }
  
```

## 5. 主播结束抽卡

```
  route:  scene.sceneHandler.dealerFinish
  
   参数:  无
    
  成功返回值: { code: 200, result: {scene object}  }
  
  失败返回值: { code: 500, error: errMsg }
  
```

## 6. 主播结束游戏

```
  route:  scene.sceneHandler.endGame
  
   参数:  无
    
  成功返回值: { code: 200, result: {scene object}  }
  
  失败返回值: { code: 500, error: errMsg }
  
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

## 3. 游戏开始

```
  Event:  GameStartEvent
    
  推送数据: { scene object }
  
```

## 4. 主播抽卡(抽一次发一次)

```
  Event:  DealerGetCardEvent
    
  推送数据: { card object }
  
```

## 5. 主播结束抽卡

```
  Event:  DealerFinishEvent
    
  推送数据: { scene object }
  
```

## 6. 结束游戏

```
  Event:  GameOverEvent
    
  推送数据: { scene object }
```

# 状态机说明
init--->(BetStartEvent)--->betting--->(GameStartEvent)--->player_started--->(EndPlayerEvent)--->dealer_turn--->(DealerFinishEvent)--->init



