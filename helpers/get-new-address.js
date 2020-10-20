var fetch = require('node-fetch')
var encodeCredentials = require("./encode-auth");

var addressData = async () => {
    var newAddress;
    var encodeKey = await encodeCredentials.encodeData();

    // Get new address.
    var bodyData = {
        'jsonrpc': '2.0',
        'id': '0',
        'method': 'getnewaddress'
    }

    try {
        console.log(process.env.SUSU_URL)
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
                console.log(resData)
                newAddress = resData.result;
            })
        return newAddress;
    } catch (error) {
        console.log("Address Generation error :: ", error);
    }
}

module.exports = {
    addressData
}