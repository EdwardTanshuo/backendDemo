var HandValueCalculator = require('./handValueCalculator.js');
var deckOperation = require('./deck.js');


function Blackjack() {

  this.deck = deckOperation;
  this.calculator = new HandValueCalculator();

  // constants
  this.BLACKJACK = this.calculator.BLACKJACK;
  this.BUSTED_VALUE = this.calculator.BUSTED_VALUE;


  this.dealNextCard = function(deck_array, callback) {
    return this.deck.drawCard(deck_array, callback);
  };

  this.dealDefaultCard = function(deck_array, callback) {
      var self = this;
      self.deck.drawCard(deck_array, function(err1, deck, card1){
          if(!!err1 || !card1){
                return callback({code: Code.COMMON.NO_CARD, msg: 'drawCard: no card' });
          }
          self.deck.drawCard(deck, function(err2, newDeck, card2){
            if(!!err2 || !card2){
                return callback({code: Code.COMMON.NO_CARD, msg: 'drawCard: no card' });
            }
            return callback(null, newDeck, card1, card2);
          })
    });
  };

  this.calculateHandValue = function(platform) {
    return this.calculator.calculateHandValue(platform);
  };
  
  this.determinePlayerWin = function(dealerTotal, playerTotal) {
    return this.calculator.determinePlayerWin(dealerTotal, playerTotal);
  }

};

module.exports = new Blackjack();
