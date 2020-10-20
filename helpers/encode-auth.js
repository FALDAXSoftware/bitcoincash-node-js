var base64 = require('base-64');

var encodeData = () => {
    return new Promise(async (resolve, reject) => {
        console.log(process.env)
        var rpccall = process.env.SUSU_USER + ':' + process.env.SUSU_PASSWORD;

        var encodedDataValue = base64.encode(rpccall);
        console.log(encodedDataValue);
        resolve(encodedDataValue)
    })
}

module.exports = {
    encodeData
}