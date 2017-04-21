var crc = require('crc');

module.exports.dispatch = function(key, list) {
	var lastChar = key[key.length -1];
	var code = lastChar.charCodeAt(0);
 	var id = list[code % list.length].id;
    return list[index];
};
