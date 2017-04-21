var crc = require('crc');

module.exports.dispatch = function(key, list) {
	var lastChar = key[key.length -1];
	var code = lastChar.charCodeAt(0);
    return list[code % list.length];
};
