/**
 * This defines the hand value calculator, it takes a player's hand and returns
 *  a numeric value representing the optimal value of the hand
 */
module.exports = function HandValueCalculator() {
  // constants
  this.BLACKJACK = 21;
  this.BUSTED_VALUE = 22;

  // the hand value calculator
  this.calculateHandValue = function(platform) {
    var totalValue = 0;
    var numberOfAces = 0;

    // protect against empty argument list or empty collection
    if (!platform || platform.length == 0) {
      return {value: 0, busted: false, numberOfHigh: 0, numberOfTrans: 0};;
    }
   
    // Calculate the non-Ace hand value, and count up the Aces. They're
    // trickier
    // so we'll do them later.
    for ( var i = 0; i < platform.length; i++) {      
      var monster = platform[i];
      var numberOfTrans = 0;
      var numberOfHigh = 0;
      switch (monster.type) {
        case 'TRANSFORM':
          cardValue = 0;
          numberOfTrans++;
          break;
        case 'SUPER':
          cardValue = 10;
          break;
        case 'NORMAL':
          cardValue = monster.value;
          break;
        default:
          throw 'calculateHandValue cannot convert unrecognized card type';
      }
      if(monster.level == 'HIGH'){
          numberOfHigh++;
      }

      totalValue += cardValue;
    }
   
    // Now we handle the case of the Aces, they're trickier because they can
    // be 1 or 11.
    if (totalValue < this.BLACKJACK) {
      for ( var j = 0; j < numberOfTrans; j++) {
        cardValue = (totalValue > 10) ? 1 : 11;
        totalValue += cardValue;
      }
    }
    return {value: ((totalValue > this.BLACKJACK) ? this.BUSTED_VALUE : totalValue), busted: ((totalValue > this.BLACKJACK) ? true : false), numberOfHigh: numberOfHigh, numberOfTrans: numberOfHigh};
  };

  
  // parameter dealerTotal and playerTotal are integers
  this.determinePlayerWin = function(dealerTotal, playerTotal) {
    if (playerTotal.value == this.BUSTED_VALUE && dealerTotal.value == this.BUSTED_VALUE) {
      return 'tie';
    } else if (dealerTotal.busted == true) {
      return 'win';
    } else if (playerTotal.busted == true) {
      return 'bust';
    } else if (playerTotal.value > dealerTotal.value) {
      return 'win';
    } else if (playerTotal.value == dealerTotal.value) {
        if(playerTotal.numberOfHigh > dealerTotal.numberOfHigh){
          return 'win';
        }
        else if (playerTotal.numberOfHigh < dealerTotal.numberOfHigh){
          return 'lose';
        }
        else{
          return 'tie';
        }
    } else {
      return 'lose';
    }
  };

  return this;
};
