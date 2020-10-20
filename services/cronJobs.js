var cron = require('node-cron');
var coinController = require('../controllers/v1/CoinsController');

// On Every Minute
cron.schedule('* * * * *', async (req, res, next) => {
    console.log("Started cron....");
    // await coinController.returnWebhookdata();
});