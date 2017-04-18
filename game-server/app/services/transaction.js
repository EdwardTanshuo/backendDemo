
var Transaction = require('../models/transaction');
var dataSyncService = require('./dataSync');
var Code = require('../../../shared/code');

function TransactionService() {
}

TransactionService.prototype.append = function(data) {
	var transaction = TransactionService(data);
	transactionCollection.insert(transaction);
	return transaction;
};

TransactionService.prototype.fetch = function(data) {
	var list = transactionCollection.find();
	return list;
};

TransactionService.prototype.delete = function(data) {
	transactionCollection.remove(data);
};

TransactionService.prototype.deleteAll = function(list) {
	list.map((aTransaction) => {
        transactionCollection.remove(aTransaction);
    });
};

module.exports = new TransactionService();