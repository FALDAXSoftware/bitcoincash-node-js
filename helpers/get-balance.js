var request = require('request');
var encodeCredentials = require("./encode-auth");

var balanceData = async () => {

    var encodeKey = await encodeCredentials.encodeData();

    var options = {
        'method': 'POST',
        'url': process.env.SUSU_URL,
        'headers': {
            'Authorization': 'Basic ' + encodeKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "jsonrpc": "2.0", "id": "1", "method": "getbalance" })

    };
    var dataValue = await new Promise(async (resolve, reject) => {
        request(options, function (error, response) {
            if (error) throw new Error(error);
            var data = JSON.parse(response.body)
            resolve(data.result)
        });
    })
    console.log("dataValue", dataValue)
    return (dataValue)
}

module.exports = {
    balanceData
}