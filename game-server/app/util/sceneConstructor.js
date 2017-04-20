var sceneConstructor = module.exports;

/*
 console.log('-----init Scene:' +  roomId + '-----------');
    //初始化游戏场景
    var newScene = new Scene();          //+
    newScene.room = roomId;              //+              
    newScene.status = 'init';            //+
    newScene.started_at = getDateTime(); //+游戏创建时间
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
*/
sceneConstructor.make = function(scene){
	var newScene = {};
	newScene.room = scene.room;
	newScene.status = scene.status;
	newScene.started_at = scene.status;
	newScene.dealer = scene.dealer;
	newScene.dealer_value = scene.dealer_value;
	newScene.dealer_platfrom = scene.dealer_platfrom;
	newScene.dealer_bets = scene.dealer_bets;
	newScene.turns = scene.turns;
	newScene.durationBet = scene.durationBet;  
	newScene.durationPlayerTurn = scene.durationPlayerTurn;  
	newScene.durationDealerTurn = scene.durationDealerTurn;  

	return newScene;
};