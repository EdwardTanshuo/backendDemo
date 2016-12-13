module.exports = function BroadcasterAction(session) {
	this.session = session;

    this.initDeckCollection = function(){

        var deckId = (session.get('currentBroadcaster').deckId != null) ? session.get('currentBroadcaster').deckId : 'default';
        console.log('------create deck for: ' + broadcaster + ' with deckId: ' + deckId + ' ----------');
        var deck = utils.createDeck(deckId);
        if(deck == null){
            return callback('no such deck');
        }
        var newModel = {};
        newModel.deck = deck;
        newModel.token = session.get('room');

        //主播的卡组加入用户缓存
        try{
            var dealerDeck = dealerDeckCollection.findOne({'token': session.get('token')});
            if(dealerDeck != null){
                dealerDeck.deck = newModel.deck;
                dealerDeckCollection.update(dealerDeck);
            } else{
                console.log('------ create deck.. ----------');
                dealerDeckCollection.insert(dealerDeck);
            }
        }
        catch(e){
            return callback(e);
        }
    };

    this.getDuck = function(roomId, callback) {
        try{
            var result = initDealerDeckCache.findOne({roomId: roomId});
            if(!result){
                return callback('dealerDrawCard: can not find deck', null);
            }
            deck = result.deck;
            if(!deck){
                return callback('dealerDrawCard: crash when query memdb', null);
            }
            callback(null, deck);
        } catch(e){
            return callback(e, null);
        }
    };

    this.getPlayerNumber = function(room_id, callback) {
        app.rpc.scene.sceneRemote.getNumberOfPlayers(this.session, {room_id: this.session.get('room')}, callback);
    };

}


