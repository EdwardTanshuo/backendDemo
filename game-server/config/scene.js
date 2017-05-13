// 游戏场景配置
module.exports = {
    "minPlayerCount" : 		0,  	//最少玩家(含主播)数量，低于该数字，游戏无法开始
    "durationBet" : 		30000, 	//游戏准备时间
    "durationPlayerTurn" : 	30000, 	//玩家回合时间
    "durationDealerTurn" : 	15000, 	//主播回合时间
    "ratio" : 2,                     //玩家获胜获得奖励是下注金额的具体倍数
    "bestRatio" : 2.5                  //用户 55+50 获胜的赔率
};