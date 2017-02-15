module.exports = {
	OK:    200,
	FAIL:  500,

	ENTRY: {
		FA_TOKEN_INVALID: 	    1001,
		FA_TOKEN_EXPIRE: 	    1002,
		FA_USER_NOT_EXIST: 	    1003,
        BROADCASTER_AUTH_FAIL:  1004    // 主播认证失败或者不存在
	}, 

	GATE: {
		FA_NO_SERVER_AVAILABLE: 2001
	},

    SCENE: {  // 房间或主播的异常

        NO_SCENE:               3001,  // 场景不存在
        NO_WEALTH:              3002,  // 主播财富值不够
        NOT_BETTING:            3003,  // 不是下注状态
        NOT_PLAYER_TURN:        3004,  // 不是玩家回合
        NOT_DEALER_TURN:        3005,  // 不是玩家回合
        NO_DECK:                3006,  // 找不到卡组
        NO_DEALER:              3007  // 找不到主播

    },

    PLAYER: {  // 玩家的异常状态
        NO_PLAYER:              4001,  // 游戏中不存在当前玩家
        NO_BET:                 4002,  // 玩家下赌注或者赌注为零
        EXIST_BET:              4003,  // 玩家已经下过注了
        NO_WEALTH:              4004,  // 玩家财富值不够
        NO_DECK:                4005  // 玩家找不到卡组

    },

    COMMON:{
        MEM_DB:                 5001,  // 操作内存数据库异常
        LESS_PARAM:             5002,  // 缺少参数
        BUSTED:                 5003,  // 查卡抽爆掉了
        NO_CARD:                5004,  // 无卡可抽
        NO_CHANNEL:             5005,  // 找不到channel
        MSG_FAIL:               5006  // 发送消息失败
    }


} 

