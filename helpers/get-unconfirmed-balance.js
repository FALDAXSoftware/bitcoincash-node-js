var fetch = require('node-fetch')
var encodeCredentials = require("./encode-auth");

var unconfirmedBalance = async (txid) => {
    var unconfirmed_balance;

    var encodeKey = await encodeCredentials.encodeData();

    // Get new address.
    var bodyData = {
        'jsonrpc': '2.0',
        'id': '0',
        'method': 'getunconfirmedbalance'
    }

    try {

        await fetch(process.env.SUSU_URL, {
            method: 'POST',
            body: JSON.stringify(bodyData),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + encodeKey
            }
        })
            .then(resData => resData.json())
            .then(resData => {
                console.log(resData.result)
                unconfirmed_balance = resData.result;
            })
        return unconfirmed_balance;
    } catch (error) {
        console.log("Balance error :: ", error);
    }
}

module.exports = {
    unconfirmedBalance
}