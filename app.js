var express = require('express');
var fs = require('fs')
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cors = require('cors');
var dotenv = require('dotenv');
var app = express();
var https = require('https');
var http = require('http');
var i18n = require("i18n");
const Validator = require('node-input-validator');
var session = require('express-session')
var cron = require('node-cron');
// var coinController = require("./controllers/v1/CoinsController")

app.use(cors())

dotenv.load(); // Configuration load (ENV file)
// Configure Locales
i18n.configure({
  locales: ['en', 'de'],
  directory: __dirname + '/locales',
  register: global
});

app.use(i18n.init);

// Json parser
app.use(bodyParser.json({
  limit: "2.7mb",
  extended: false
}));
app.use(bodyParser.urlencoded({
  limit: "2.7mb",
  extended: false
}));



app.all('/*', function (req, res, next) {
  // CORS headers
  res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,Client-Key,x-token');
  if (req.headers.language) { // If header send language, then set to that language
    i18n.setLocale(req.headers.language);
  }
  console.log(req.headers["x-token"])
  if (req.url != "/api/v1/health-check" && req.headers["x-token"] != "faldax-bitcoin-cash-node") {
    res
      .status(403)
      .json({ status: 403, message: ("Unauthorized access") });
  }
  if (req.method == 'OPTIONS') {
    res
      .status(200)
      .end();
  } else {
    next();
  }
});



var server = http.createServer(app);

//Routes
app.use('/', require('./routes'));
app.use(function (req, res, next) {
  var err = new Error('Resource Not Found');
  err.status = 404;
  var resources = {};
  res.status(404);
  resources.status = err.status;
  resources.message = err.message;
  return res.json(resources);
});


// process.on('uncaughtException', function (error) {}); // Ignore error

// Start the server
app.set('port', process.env.PORT);
server.listen(app.get('port'), function () {
  console.log(process.env.PROJECT_NAME + " Application is running on " + process.env.PORT + " port....");
});

var cronjobFile = require("./services/cronJobs");

sendEmail = async (slug, user) => {
  var EmailTemplate = require("./models/EmailTemplateModel");
  var helpers = require("./helpers/helpers")
  let template = await EmailTemplate
    .query()
    .first()
    .select()
    .where("slug", slug);

  let user_language = (user.default_language ? user.default_language : 'en');
  console.log("user_language", user_language)
  let language_content = template.all_content[user_language].content;
  console.log("language_content", language_content)
  let language_subject = template.all_content[user_language].subject;
  var object = {};
  object.recipientName = user.first_name;
  console.log("object", object)
  if (user.reason && user.reason != undefined && user.reason != null) {
    object.reason = user.reason
  }

  if (user.limitType && user.limitType != undefined && user.limitType != null)
    object.limit = user.limitType

  if (user.amountReceived && user.amountReceived != undefined && user.amountReceived != "") {
    object.amountReceived = user.amountReceived
  }

  if (user.firstCoin && user.firstCoin != undefined && user.firstCoin != "") {
    object.firstCoin = user.firstCoin
  }

  if (user.secondCoin && user.secondCoin != undefined && user.secondCoin != "") {
    object.secondCoin = user.secondCoin
  }

  if (user.firstAmount && user.firstAmount != undefined && user.firstAmount != "") {
    object.firstAmount = user.firstAmount
  }

  if (user.secondAmount && user.secondAmount != undefined && user.secondAmount != "") {
    object.secondAmount = user.secondAmount
  }

  if (user.coinName && user.coinName != undefined && user.coinName != null) {
    object.coin = user.coinName
  }
  language_content = await helpers.formatEmail(language_content, object);

  console.log(language_content)

  try {
    console.log("user.email", user.email)
    await app.mailer
      .send('emails/general_mail.ejs', {
        to: user.email,
        subject: language_subject,
        content: (language_content),
        PROJECT_NAME: process.env.PROJECT_NAME,
        SITE_URL: process.env.SITE_URL,
        homelink: process.env.SITE_URL
      }, function (err, body) {
        console.log("err", err);
        console.log("body", body)
        if (err) {
          return 0;
        } else {
          return 1;
        }
      });
  } catch (err) {
    console.log("EMail err:", (err));
    return 0;
  }
}

module.exports = {
  sendEmail: sendEmail
}