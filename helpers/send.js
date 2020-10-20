var fetch = require('node-fetch')
var encodeCredentials = require("./encode-auth");

var sendData = async (sendInfo) => {
    var sendedFundStatus;
    var encodeKey = await encodeCredentials.encodeData();

    //Body Data for sending funds
    var bodyData = {
        'jsonrpc': '2.0',
        'id': '0',
        'method': 'sendtoaddress',
        'params': [sendInfo.address, sendInfo.amount, sendInfo.message]
    }

    console.log(bodyData)

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
                console.log(resData)
                if (resData.error) {
                    sendedFundStatus = {
                        flag: 1,
                        status: 500,
                        message: resData.error.message
                    }
                } else {
                    sendedFundStatus = resData.result;
                    sendedFundStatus.flag = 0;
                }
            })
        return sendedFundStatus;
    } catch (error) {
        console.log("Send fund error :: ", error);
    }
}

module.exports = {
    sendData
}