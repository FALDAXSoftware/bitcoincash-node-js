var fetch = require('node-fetch')

var convertValue = async (sendInfo) => {
    var getConvertedValue;

    try {

        await fetch(`https://api.coingecko.com/api/v3/coins/susucoin`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(resData => resData.json())
            .then(resData => {
                var object = {
                    "USD": resData.market_data.current_price.usd,
                    "EUR": resData.market_data.current_price.eur,
                    "INR": resData.market_data.current_price.inr
                }
                getConvertedValue = object;
            })
        return getConvertedValue;
    } catch (error) {
        console.log("Send fund error :: ", error);
    }
}

module.exports = {
    convertValue
}