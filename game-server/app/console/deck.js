/**
 * This simulates the shoe (the deck of cards). We are not keeping track of
 * "burnt" cards
 */
function DeckOperation() {  
};

DeckOperation.prototype.drawCard = function(deck, callback){
  if(!deck.length){
    return callback('no card', deck, null);
  }
  else{
    var total_weight = 0;
    var index_table = [];
    for(var i = 0; i < deck.length; i ++){
      var monster = deck[i];
      total_weight = total_weight + monster.weight * 2;
      index_table.push(monster.weight * 2);
    }
    var rd = Math.floor(Math.random() * total_weight) + deck[0] * 2;
    var index = 0;
    for(index = 0; index < deck.length; index ++){
      if(index_table[index] < rd){
        continue;
      }
      else{
        break;
      }
    }
    var result = deck[index];
    deck.splice(index, 1);
    return callback(null, deck, result);
  }
}

module.exports = new DeckOperation();