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

  this.calculateHandValue = function(platform) {
    return this.calculator.calculateHandValue(platform);
  };
  
  this.determinePlayerWin = function(dealerTotal, playerTotal) {
    return this.calculator.determinePlayerWin(dealerTotal, playerTotal);
  }

};

module.exports = new Blackjack();
