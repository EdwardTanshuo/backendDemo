/**
 * This simulates the shoe (the deck of cards). We are not keeping track of
 * "burnt" cards
 */
function DeckOperation() {  
};

/**
 * Client draw card.
 *
 * @param  {Array}    deck      current deck array
 * @param  {Function} callback  callback with error, new deck and result
 * @return {Void}
 */
DeckOperation.prototype.drawCard = function(deck, callback){
  if(!deck.length){
    return callback('no card', deck, null);
  }
  else{
    var total_weight = 0;
    var index_table = [];
    for(var i = 0; i < deck.length; i ++){
      var monster = deck[i];
      total_weight = total_weight + monster.weight;
      index_table.push(total_weight);
    }
    var rd = Math.random() * total_weight;
    var index = 0;
    for(index = 0; index < deck.length; index ++){
      if(rd > index_table[index]){
        continue;
      }
      else{
        break;
      }
    }
    var result = deck[index];
    var new_deck = deck.splice(index, 1);
    return callback(null, deck, result);
  }
}

module.exports = new DeckOperation();