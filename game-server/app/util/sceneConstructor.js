var sceneConstructor = module.exports;

sceneConstructor.make = function(scene){
	delete scene.players;
    delete scene.player_platfroms;
    delete scene.player_values;
    delete scene.player_bets; 
    delete scene.dealer_deck; 
	return scene;
};