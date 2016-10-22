var request = require("request");

function DataSyncService() {
}

DataSyncService.prototype.saveRole = function(data, callback) {
 
     var options = {
         method: 'PUT',
         url: config.mobileSrv.url,
         headers: this.headers,
         form: data
     };

     request(options, (err, response, body) => {
         if (err) {
             callback(err); // error response
         } else {
             callback(null, response, body); // successful response
         }
     });
};

module.exports = new DataSyncService();