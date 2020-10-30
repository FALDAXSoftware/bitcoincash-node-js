var express = require('express');
// var router = express.Router();

var app = express();

var CoinsRoute = require("../controllers/v1/CoinsController");

app.get("/api/v1/get-bitcoin-cash-coin-address", CoinsRoute.updateWalletAddress);
app.post("/api/v1/create-bitcoin-cash-coin-address", CoinsRoute.createUserAddress);
app.post("/api/v1/send-bitcoin-cash-coin-address", CoinsRoute.userSendFund);
app.post("/api/v1/get-user-balance", CoinsRoute.getUserBalance);
app.post("/api/v1/get-user-transaction-list", CoinsRoute.getUserTransactions);
app.get("/api/v1/list-transactions-list", CoinsRoute.getListTransactions);
app.get("/get/v1/get-webhook-data", CoinsRoute.returnWebhookdata);
app.get("/api/v1/get-currency-converted-value", CoinsRoute.getEquivalentValue);
app.get("/api/v1/get-account-balance", CoinsRoute.getBalanceValue);
app.post("/api/v1/get-bitcoin-cash-fees", CoinsRoute.getEstimatedFees);
app.get("/api/v1/get-transaction-list", CoinsRoute.coinWarmTransactionList);
app.get('/api/v1/health-check', CoinsRoute.healthCheck)


app.use(function (req, res, next) {
    var err = new Error('Resource Not Found');
    err.status = 404;
    var resources = {};
    res.status(404);
    resources.status = err.status;
    resources.message = err.message;
    return res.json(resources);
});

module.exports = app;
