var fetch = require('node-fetch')
var encodeCredentials = require("./encode-auth");

var listTransaction = async (start, end) => {
    var transactionData;

    var encodeKey = await encodeCredentials.encodeData();

    var bodyData
    console.log(start && end)
    // Get Transaction List.
    if (start >= 0 && end >= 0) {
        bodyData = {
            'jsonrpc': '2.0',
            'id': '0',
            'method': 'listtransactions',
            'params': ["*", start, end]
        }
    } else {
        bodyData = {
            'jsonrpc': '2.0',
            'id': '0',
            'method': 'listtransactions'
        }
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
                transactionData = resData.result;
            })
        return transactionData;
    } catch (error) {
        console.log("Balance error :: ", error);
    }
}

module.exports = {
    listTransaction
}