/**
 * UsersController
 *
 */
const { raw } = require('objection');
var moment = require('moment');
var fetch = require('node-fetch');
const v = require('node-input-validator');
const Bluebird = require('bluebird');
fetch.Promise = Bluebird;
var bcrypt = require('bcryptjs');
var aesjs = require('aes-js');
var i18n = require("i18n");
var fs = require('file-system');
// Extra
var Helper = require("../../helpers/helpers");
var addressHelper = require("../../helpers/get-new-address");
var sendHelper = require("../../helpers/send");
var balanceHelper = require("../../helpers/get-receiveby-address");
var transactionHelper = require("../../helpers/get-wallet-balance");
var transactionDetailHelper = require("../../helpers/get-transaction");
var listTransactionHelper = require("../../helpers/list-transaction")
var balanceValueHelper = require("../../helpers/get-balance");
var getRawTransaction = require("../../helpers/get-raw-transaction");
var decodeRawTransaction = require("../../helpers/decode-raw-transaction");
var getFiatValuHelper = require("../../helpers/get-fiat-value");
var currencyConversionHelper = require("../../helpers/get-currency-conversion");
var getEstimatedFeeHelper = require("../../helpers/get-estimated-fee");
const constants = require('../../config/constants');
// Controllers
var { AppController } = require('./AppController');
// Models
var UsersModel = require('../../models/v1/UsersModel');
var CoinsModel = require('../../models/v1/CoinsModel');
var WalletModel = require('../../models/v1/WalletModel');
var WalletHistoryModel = require('../../models/v1/WalletHistory');
var TransactionTableModel = require('../../models/v1/TransactionTableModel');
var UserNotificationModel = require("../../models/v1/UserNotifcationModel");
var CurrencyConversionModel = require("../../models/v1/CurrencyConversion");
var AdminSettingModel = require("../../models/v1/AdminSettingModel");

/**
 * Users
 * It's contains all the opration related with users table. Like userList, userDetails,
 * createUser, updateUser, deleteUser and changeStatus
 */
class UsersController extends AppController {

    constructor() {
        super();

    }

    // Get User Address

    async createUserAddress(req, res) {
        try {
            var user_id = req.body.user_id;
            var label = req.body.label;
            var coinData = await CoinsModel
                .query()
                .first()
                .where('deleted_at', null)
                .andWhere('coin_code', process.env.COIN)
                .andWhere('is_active', true)
                .andWhere('type', 1)
                .orderBy('id', 'DESC')

            if (coinData != undefined) {
                var walletData = await WalletModel
                    .query()
                    .first()
                    .where("deleted_at", null)
                    .andWhere("user_id", user_id)
                    .andWhere("coin_id", coinData.id)
                    .orderBy('id', 'DESC')

                console.log("walletData", walletData)

                if (walletData == undefined) {
                    var userReceiveAddress = await addressHelper.addressData();

                    var data = userReceiveAddress.split(":")

                    var dataValue = await WalletModel
                        .query()
                        .insertAndFetch({
                            "receive_address": data[1],
                            "coin_id": coinData.id,
                            "user_id": user_id,
                            "deleted_at": null,
                            "created_at": Date.now(),
                            "wallet_id": "wallet",
                            "address_label": label,
                            "balance": 0.0,
                            "placed_balance": 0.0
                        })
                    return res
                        .status(200)
                        .json({
                            "status": 200,
                            "message": "User Address has been created successfully.",
                            "data": dataValue
                        })
                } else {
                    return res
                        .status(400)
                        .json({
                            "status": 400,
                            "message": "Wallet has already been created"
                        })
                }
            } else {
                return res
                    .status(500)
                    .json({
                        "status": 500,
                        "message": "Coin Not Found"
                    })
            }
        } catch (error) {
            console.log(error)
        }
    }

    // Get Warm Wallet and Custody Wallet Address

    async updateWalletAddress(req, res) {
        try {

            var coinData = await CoinsModel
                .query()
                .first()
                .where('deleted_at', null)
                .andWhere('coin_code', process.env.COIN)
                .andWhere('is_active', true)
                // .andWhere('type', 2)
                .orderBy('id', 'DESC')

            var getWarmWalletAddress = await addressHelper.addressData();

            var getColdWalletAddress = await addressHelper.addressData();
            await coinData
                .$query()
                .patch({
                    "warm_wallet_address": getWarmWalletAddress,
                    "custody_wallet_address": getColdWalletAddress
                })

            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Address Created Successffully."
                })

        } catch (error) {
            console.log("Wallet Address error :: ", error);
        }
    }

    // Send susu coin to User Address

    async userSendFund(req, res) {
        try {
            console.log(req.body)
            var user_id = req.body.user_id;
            var amount = req.body.amount;
            var destination_address = req.body.destination_address;
            var faldax_fee = req.body.faldax_fee;
            var network_fee = req.body.network_fee;
            var is_admin = (req.body.is_admin) ? (req.body.is_admin) : false;
            console.log(req.body);
            console.log("is_admin", is_admin)
            var coinData = await CoinsModel
                .query()
                .first()
                // .where('deleted_at', null)
                .andWhere('coin_code', process.env.COIN)
                .andWhere('is_active', true)
                // .andWhere('type', 2)
                .orderBy('id', 'DESC')

            console.log("coinData", coinData);

            if (coinData != undefined) {

                var walletData = await WalletModel
                    .query()
                    .first()
                    .where("deleted_at", null)
                    .andWhere("user_id", user_id)
                    .andWhere("coin_id", coinData.id)
                    .andWhere("is_admin", is_admin)
                    .orderBy('id', 'DESC');

                console.log("walletData", walletData)

                // var getAccountBalance = await balanceValueHelper.balanceData();
                if (walletData != undefined) {
                    console.log("parseFloat(faldax_fee)", parseFloat(faldax_fee))
                    console.log("parseFloat(amount)", parseFloat(amount))
                    var balanceChecking = parseFloat(amount) + parseFloat(faldax_fee) + parseFloat(network_fee);
                    console.log("balanceChecking", balanceChecking)
                    // if (getAccountBalance >= balanceChecking) {
                    if (walletData.placed_balance >= balanceChecking) {
                        var sendObject = {
                            "address": destination_address,
                            "amount": amount,
                            "message": "test"
                        }

                        console.log("sendObject", sendObject)

                        var userReceiveAddress = await sendHelper.sendData(sendObject);
                        console.log("userReceiveAddress", userReceiveAddress)
                        if (userReceiveAddress.flag == 1) {
                            return res
                                .status(500)
                                .json({
                                    "status": 500,
                                    "message": userReceiveAddress.message
                                })
                        }
                        var getTransactionDetails = await transactionDetailHelper.getTransaction(userReceiveAddress);
                        console.log("getTransactionDetails", getTransactionDetails)
                        if (getTransactionDetails != undefined) {
                            var realNetworkFee = parseFloat(-(getTransactionDetails.fee)).toFixed(8)
                            var balanceUpdate = parseFloat(faldax_fee) + parseFloat(Math.abs(realNetworkFee))
                            var balanceValueUpdateValue = parseFloat(amount) + parseFloat(balanceUpdate);
                            var balanceValueUpdate = parseFloat(walletData.balance) - parseFloat(balanceValueUpdateValue);
                            var placedBlanaceValueUpdate = parseFloat(walletData.placed_balance) - parseFloat(balanceValueUpdateValue)
                            console.log("balanceValueUpdate", balanceValueUpdate)
                            console.log("placedBlanaceValueUpdate", placedBlanaceValueUpdate)
                            var walletDataUpdate = await WalletModel
                                .query()
                                .where("deleted_at", null)
                                .andWhere("user_id", user_id)
                                .andWhere("coin_id", coinData.id)
                                .andWhere("is_admin", is_admin)
                                .patch({
                                    "balance": balanceValueUpdate,
                                    "placed_balance": placedBlanaceValueUpdate
                                })

                            var getFiatValues = await getFiatValuHelper.getFiatValue(process.env.COIN);

                            console.log("getFiatValues", getFiatValues)


                            var transactionData = await WalletHistoryModel
                                .query()
                                .insert({
                                    "source_address": walletData.receive_address,
                                    "destination_address": destination_address,
                                    "amount": balanceValueUpdateValue,
                                    "actual_amount": amount,
                                    "transaction_type": "send",
                                    "created_at": new Date(),
                                    "coin_id": coinData.id,
                                    "transaction_id": getTransactionDetails.txid,
                                    "faldax_fee": faldax_fee,
                                    "actual_network_fees": -(getTransactionDetails.fee),
                                    "estimated_network_fees": 0.01,
                                    "user_id": walletData.user_id,
                                    "is_admin": is_admin,
                                    "fiat_values": getFiatValues
                                });

                            var transactionValue = await TransactionTableModel
                                .query()
                                .insert({
                                    "source_address": walletData.receive_address,
                                    "destination_address": destination_address,
                                    "amount": balanceValueUpdateValue,
                                    "actual_amount": amount,
                                    "transaction_type": "send",
                                    "created_at": new Date(),
                                    "coin_id": coinData.id,
                                    "transaction_id": getTransactionDetails.txid,
                                    "faldax_fee": faldax_fee,
                                    "actual_network_fees": -(getTransactionDetails.fee),
                                    "estimated_network_fees": 0.01,
                                    "transaction_from": "Send to Destination",
                                    "user_id": walletData.user_id,
                                    "is_admin": is_admin
                                });


                            if (is_admin == false) {
                                var walletBalance = await WalletModel
                                    .query()
                                    .first()
                                    .where("deleted_at", null)
                                    .andWhere("coin_id", coinData.id)
                                    .andWhere("is_admin", true)
                                    .andWhere("user_id", 36)
                                    .orderBy('id', 'DESC')
                                if (walletBalance != undefined) {
                                    var amountToBeAdded = 0.0
                                    amountToBeAdded = parseFloat(faldax_fee)
                                    console.log("amountToBeAdded", amountToBeAdded)
                                    console.log("walletBalance.balance", walletBalance.balance)
                                    var updateWalletBalance = await WalletModel
                                        .query()
                                        .where("deleted_at", null)
                                        .andWhere("coin_id", coinData.id)
                                        .andWhere("is_admin", true)
                                        .andWhere("user_id", 36)
                                        .patch({
                                            "balance": parseFloat(walletBalance.balance) + parseFloat(amountToBeAdded),
                                            "placed_balance": parseFloat(walletBalance.placed_balance) + parseFloat(amountToBeAdded)
                                        });

                                    var walletHistoryValue = await WalletHistoryModel
                                        .query()
                                        .insert({
                                            "source_address": walletData.receive_address,
                                            "destination_address": walletBalance.receive_address,
                                            "amount": parseFloat(amountToBeAdded).toFixed(8),
                                            "actual_amount": amount,
                                            "transaction_type": "send",
                                            "created_at": new Date(),
                                            "coin_id": coinData.id,
                                            "transaction_id": getTransactionDetails.txid,
                                            "faldax_fee": faldax_fee,
                                            "actual_network_fees": 0.0,
                                            "estimated_network_fees": 0.0,
                                            "user_id": 36,
                                            "is_admin": true,
                                            "fiat_values": getFiatValues
                                        })
                                }
                            }

                            var userData = await UsersModel
                                .query()
                                .first()
                                .select()
                                .where("deleted_at", null)
                                .andWhere("is_active", true)
                                .andWhere("id", user_id);

                            var userNotification = await UserNotificationModel
                                .query()
                                .first()
                                .select()
                                .where("deleted_at", null)
                                .andWhere("user_id", user_id)
                                .andWhere("slug", "withdraw");

                            var coin_data = await CoinModel
                                .query()
                                .first()
                                .select()
                                .where("id", coinData.id);

                            if (coin_data != undefined) {
                                userData.coinName = coin_data.coin;
                            } else {
                                userData.coinName = "-";
                            }

                            // userData.coinName = coin.coin_code;
                            userData.amountReceived = parseFloat(userBalanceUpdateValue).toFixed(8);

                            console.log("userData", userData)

                            if (userNotification != undefined) {
                                if (userNotification.email == true || userNotification.email == "true") {
                                    if (userData.email != undefined) {
                                        console.log(userData);
                                        await Helper.SendEmail("withdraw", userData)
                                    }
                                }
                                if (userNotification.text == true || userNotification.text == "true") {
                                    if (userData.phone_number != undefined && userData.phone_number != null && userData.phone_number != '') {
                                        await Helper.sendSMS("withdraw", userData)
                                    }
                                }
                            }
                        }

                        return res
                            .status(200)
                            .json({
                                "status": 200,
                                "message": "Send Coins successfully.",
                                "data": balanceValueUpdateValue
                            })
                    } else {
                        return res
                            .status(201)
                            .json({
                                "status": 201,
                                "message": "Insufficient Balance in the wallet"
                            })
                    }
                } else {
                    return res
                        .status(400)
                        .json({
                            "status": 400,
                            "message": "Wallet Data Not Found"
                        })
                }

            } else {
                return res
                    .status(500)
                    .json({
                        "status": 500,
                        "message": "Coin Not Found"
                    })
            }
        } catch (error) {
            console.log(error)
        }
    }

    // Get User Balance
    async getUserBalance(req, res) {
        try {
            var address = req.body.address;

            var balanceValue = await balanceHelper.getReceiveByAddress(address);
            console.log("balanceValue", balanceValue)
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "User Balance has been retrieved successfully",
                    "data": balanceValue
                })
        } catch (error) {
            console.log(error)
        }
    }

    // Get User Transactions Value
    async getUserTransactions(req, res) {
        try {
            var address = req.body.address;

            var transactionList = await transactionHelper.balanceData(address)
            var transactionDetails = [];
            console.log(transactionList)
            for (var i = 0; i < transactionList.length; i++) {
                console.log(transactionList[i])
                var detailValue = await transactionDetailHelper.getTransaction(transactionList[i]);
                console.log("Transaction ID >>>>>>>", transactionList[i], "-------==--------", detailValue);
                var obejct = {
                    "txid": transactionList[i],
                    "details": detailValue.details,
                    "amount": detailValue.amount
                }
                transactionDetails.push(obejct);
            }
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Transaction Details has been retreived Successfully",
                    "data": transactionDetails
                })
        } catch (error) {
            console.log(error)
        }
    }

    // Get List of Transactions
    async getListTransactions(req, res) {
        try {
            var transactionList = await listTransactionHelper.listTransaction()
            console.log(transactionList)
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Transaction Details has been retreived Successfully",
                    "data": transactionList
                })
        } catch (error) {
            console.log(error)
        }
    }

    // Update File trnasaction Value for next webhook
    async fileValueUpdate(dataValue, flag) {
        return new Promise(async (resolve, reject) => {
            if (flag == 2) {
                fs.unlinkSync('transaction.txt')
            }
            var transactionHash;
            if (fs.existsSync('transaction.txt')) {
                await fs.readFile('transaction.txt', (err, data) => {
                    if (err) {
                        console.log(err)
                    }
                    var value = data.toString();
                    transactionHash = value.split(`"`)
                    if (flag == 1) {
                        resolve(transactionHash[1]);
                    }
                })
            } else {
                if (flag == 2) {
                    var value = await fs.writeFile("transaction.txt", JSON.stringify(dataValue), async function (err) {
                        if (err) {
                            console.log(err)
                        } else {
                            value = "File Written Successfully";
                        }
                        return value;
                    })
                    transactionHash = value;
                } else {
                    transactionHash = ''
                }
                resolve(transactionHash);
            }
        })
    }

    // If file transaction value and latest transaction are same then do nothing or if receive then update user wallet
    async getTransactionData(flag, entries, index, transactionValue) {
        if (flag == false || flag == "false" && entries < 50) {
            var dataValue = await listTransactionHelper.listTransaction(entries, index);
            var flagValue = false;
            for (var i = (dataValue.length - 1); i >= index; i--) {
                if (dataValue[i].txid == transactionValue) {
                    flagValue == true;
                    return 1;
                } else if (dataValue[i].category == "receive") {
                    var dataTransaction = await getRawTransaction.getTransaction(dataValue[i].txid)
                    console.log(dataTransaction)
                    var dataTransactionValue = await decodeRawTransaction.getTransaction(dataTransaction);
                    if (dataTransactionValue != null) {
                        console.log("dataTransactionValue", dataTransactionValue);
                        var sourcxeAddressValue = (dataTransactionValue['vout'])
                        var valiueIm = (dataTransactionValue['vout']);
                        sourcxeAddressValue = valiueIm[0]['scriptPubKey']['addresses'][0]

                        var walletHistoryData = await WalletHistoryModel
                            .query()
                            .first()
                            .where('deleted_at', null)
                            .andWhere('transaction_id', dataValue[i].txid)
                            .andWhere('transaction_type', 'receive')
                            .orderBy('id', 'DESC');
                        console.log("walletHistoryData", walletHistoryData);

                        if (walletHistoryData == undefined) {
                            // console.log("sourcxeAddressValue", sourcxeAddressValue)
                            var walletData = await WalletModel
                                .query()
                                .first()
                                .select()
                                .where('receive_address', dataValue[i].address)
                                .andWhere('deleted_at', null)
                                .orderBy('id', 'DESC');

                            console.log("walletData", walletData);

                            if (walletData != undefined) {
                                console.log("In sourcxeAddressValue", sourcxeAddressValue)
                                var object = {
                                    'destination_address': dataValue[i].address,
                                    'source_address': sourcxeAddressValue,
                                    'created_at': new Date(),
                                    'amount': dataValue[i].amount,
                                    "actual_amount": dataValue[i].amount,
                                    'coin_id': walletData.coin_id,
                                    'transaction_type': 'receive',
                                    'transaction_id': dataValue[i].txid,
                                    'user_id': walletData.user_id,
                                    'faldax_fee': 0.0,
                                    'actual_network_fees': (dataValue[i].fee) ? (dataValue[i].fee) : (0.0),
                                    'estimated_network_fees': 0.01,
                                    "faldax_fee": 0.0,
                                    "residual_amount": 0.0,
                                    "user_id": walletData.user_id,
                                    "is_admin": false
                                }

                                console.log("object", object)
                                var walletHistoryData = await WalletHistoryModel
                                    .query()
                                    .insert({
                                        'destination_address': dataValue[i].address,
                                        'source_address': sourcxeAddressValue,
                                        'created_at': new Date(),
                                        'amount': dataValue[i].amount,
                                        "actual_amount": dataValue[i].amount,
                                        'coin_id': walletData.coin_id,
                                        'transaction_type': 'receive',
                                        'transaction_id': dataValue[i].txid,
                                        'user_id': walletData.user_id,
                                        'faldax_fee': 0.0,
                                        'actual_network_fees': (dataValue[i].fee) ? (dataValue[i].fee) : (0.0),
                                        'estimated_network_fees': 0.01,
                                        "faldax_fee": 0.0,
                                        "residual_amount": 0.0,
                                        "user_id": walletData.user_id,
                                        "is_admin": false
                                    })

                                var transactionValue = await TransactionTableModel
                                    .query()
                                    .insert({
                                        'destination_address': dataValue[i].address,
                                        'source_address': sourcxeAddressValue,
                                        'created_at': new Date(),
                                        'amount': dataValue[i].amount,
                                        "actual_amount": dataValue[i].amount,
                                        'coin_id': walletData.coin_id,
                                        'transaction_type': 'receive',
                                        'transaction_id': dataValue[i].txid,
                                        'user_id': walletData.user_id,
                                        'faldax_fee': 0.0,
                                        'actual_network_fees': (dataValue[i].fee) ? (dataValue[i].fee) : (0.0),
                                        'estimated_network_fees': 0.01,
                                        "faldax_fee": 0.0,
                                        "residual_amount": 0.0,
                                        "transaction_from": "Destination To Receive",
                                        "user_id": walletData.user_id,
                                        "is_admin": false,
                                        "receiver_user_balance_before": walletData.balance
                                    });

                                var coinData = await CoinsModel
                                    .query()
                                    .first()
                                    // .where('deleted_at', null)
                                    .andWhere('coin_code', process.env.COIN)
                                    // .andWhere('is_active', true)
                                    .andWhere('type', 2)
                                    .orderBy('id', 'DESC')

                                var walletValue = await WalletModel
                                    .query()
                                    .first()
                                    .select()
                                    .where('deleted_at', null)
                                    .andWhere('coin_id', coinData.id)
                                    .andWhere('wallet_id', 'warm_wallet')
                                    .orderBy('id', 'DESC');

                                var updatedBalance = parseFloat(walletData.balance) + parseFloat(dataValue[i].amount)
                                var updatedPlacedBalance = parseFloat(walletData.placed_balance) + parseFloat(dataValue[i].amount)

                                var balanceData = await WalletModel
                                    .query()
                                    .where('receive_address', dataValue[i].address)
                                    .andWhere('deleted_at', null)
                                    .patch({
                                        'balance': updatedBalance,
                                        'placed_balance': updatedPlacedBalance
                                    });

                                var userData = await UsersModel
                                    .query()
                                    .first()
                                    .select()
                                    .where("deleted_at", null)
                                    .andWhere("is_active", true)
                                    .andWhere("id", user_id);

                                var userNotification = await UserNotificationModel
                                    .query()
                                    .first()
                                    .select()
                                    .where("deleted_at", null)
                                    .andWhere("user_id", user_id)
                                    .andWhere("slug", "receive");

                                if (coinData != undefined) {
                                    userData.coinName = coinData.coin;
                                } else {
                                    userData.coinName = "-";
                                }

                                userData.amountReceived = (valueToBeAdded).toFixed(8);

                                if (userNotification != undefined) {
                                    if (userNotification.email == true || userNotification.email == "true") {
                                        if (userData.email != undefined) {
                                            console.log(userData);
                                            await Helper.SendEmail("receive", userData)
                                        }
                                    }
                                    if (userNotification.text == true || userNotification.text == "true") {
                                        if (userData.phone_number != undefined && userData.phone_number != null && userData.phone_number != '') {
                                            await Helper.sendSMS("receive", userData)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (flagValue == true) {
                    break;
                }
            }
            if (flagValue == true) {
                return 1;
            } else {
                await module.exports.getTransactionData(false, (entries + 10), (index + 10))
            }
        } else {
            return 1;
        }
    }

    // Webhook for transaction history
    async returnWebhookdata() {
        try {
            console.log("ISNIDE METHOD")
            var transactionHash;
            var transactionValue = await module.exports.fileValueUpdate("", 1)
            var dataValue = await listTransactionHelper.listTransaction(10, 0);
            var data = dataValue[dataValue.length - 1].txid;
            var value = await module.exports.getTransactionData(false, 10, 0, transactionValue)
            var transactionValue = await module.exports.fileValueUpdate(data, 2)
        } catch (error) {
            console.log(error);
        }
    }

    async getEquivalentValue(req, res) {
        try {
            var data = await currencyConversionHelper.convertValue();
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Currency Value has been retrieved successfully",
                    "data": data
                })
        } catch (error) {
            console.log(error);
        }
    }

    async getBalanceValue(req, res) {
        try {
            var getAccountBalance = await balanceValueHelper.balanceData();

            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "User Balance has been listed successfully",
                    "data": getAccountBalance
                })
        } catch (error) {

        }
    }

    async getEstimatedFees(req, res) {
        try {
            let req_body = req.body;
            let totalKB = ((parseInt(req_body.from_address_count) * 180) + (parseInt(req_body.to_address_count) * 34) + 10 - parseInt(req_body.from_address_count)) / 1024;
            var getFee = await getEstimatedFeeHelper.getFee();

            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Litecoin Fees",
                    "data": { "totalKB": totalKB, "fee": getFee }
                })
        } catch (error) {
            console.log(error);
        }
    }

    async coinWarmTransactionList(req, res) {
        try {

            var coinData = await CoinsModel
                .query()
                .first()
                .select()
                .where("deleted_at", null)
                .andWhere("coin_code", process.env.COIN);

            var coinFiatValue = await CurrencyConversionModel
                .query()
                .first()
                .select()
                .where("deleted_at", null)
                .andWhere("coin_id", coinData.id);
            var transactionList = await listTransactionHelper.listTransaction()
            console.log(transactionList)

            var responseObject = {}

            var transfers = [];

            // Remove this object
            var transactionList = [
                {
                    address: 'SfPGv8gykt9qveJUdEwFw7GkM2i3CQk9As',
                    category: 'send',
                    amount: -400,
                    label: '',
                    vout: 1,
                    fee: -0.00329032,
                    confirmations: 29943,
                    blockhash: '000000000000000146dd4f93b5dbd56650336c27f33886b451fcc28db2fcd0e1',
                    blockindex: 2,
                    blocktime: 1599645749,
                    txid: '6cb7e626e77be0f5812fe8559b307dd179116d68c8cc7924347cbbcd51630b32',
                    walletconflicts: [],
                    time: 1599645459,
                    timereceived: 1599645459,
                    'bip125-replaceable': 'no',
                    comment: 'test',
                    abandoned: false
                },
                {
                    address: 'ShbqNsVeKw5gyxgtxPC46vmj7JmsJ4DhND',
                    category: 'send',
                    amount: -85088.49,
                    vout: 0,
                    fee: -0.04473445,
                    confirmations: 17379,
                    blockhash: '00000000000004b5c8096b63dae159502fb50f1a9c0b4ba833f00d2987a3f415',
                    blockindex: 1,
                    blocktime: 1601168377,
                    txid: '5a8518763d40669ee05d180ad736003a7dc52f9f2abaf00d9712d9824a08fd58',
                    walletconflicts: [],
                    time: 1601168329,
                    timereceived: 1601168329,
                    'bip125-replaceable': 'no',
                    comment: 'test',
                    abandoned: false
                },
                {
                    address: 'Sh357J8bTE1j61f72ybYpPJ8QkW1Gvb6AT',
                    category: 'send',
                    amount: -13779.35875824,
                    vout: 0,
                    fee: -0.05819617,
                    confirmations: 17378,
                    blockhash: '00000000000000850555aca40e33e2ef6d9dace2faa8bf54e64632aa8208114c',
                    blockindex: 1,
                    blocktime: 1601168796,
                    txid: 'cb492e502c622e8611abb06ce2ea4c30aecc0d69da36722615d50fa03ee10347',
                    walletconflicts: [],
                    time: 1601168519,
                    timereceived: 1601168519,
                    'bip125-replaceable': 'no',
                    comment: 'test',
                    abandoned: false
                },
                {
                    address: 'SZfeja6pRJLaCmQK9tDZW3UKMzKpKA8Aok',
                    category: 'send',
                    amount: -5444.43564356,
                    vout: 1,
                    fee: -0.00972848,
                    confirmations: 17288,
                    blockhash: '00000000000002c4dadb35250242e2119cefe994f8dc436344a56459824b7cca',
                    blockindex: 1,
                    blocktime: 1601179959,
                    txid: 'af31426f5b1e4536f55bd6d855c1c3ab6b395f977216cf8f2d68c7fc3fbab71e',
                    walletconflicts: [],
                    time: 1601179565,
                    timereceived: 1601179565,
                    'bip125-replaceable': 'no',
                    comment: 'test',
                    abandoned: false
                },
                {
                    address: 'SbohWtoVmSXgHyieqm8BnujDoVa7VjfQz7',
                    category: 'receive',
                    amount: 192.51766959,
                    label: '',
                    vout: 0,
                    confirmations: 5110,
                    blockhash: '0000000000000321448c036c8e8974fcad1919c714c47120cc86233e4f8b21b5',
                    blockindex: 1,
                    blocktime: 1602656180,
                    txid: '11df19a71e626ee8ecb1e5f78bf46d88e64955e9c66b0c849cfb058395673765',
                    walletconflicts: [],
                    time: 1602656033,
                    timereceived: 1602656033,
                    'bip125-replaceable': 'no'
                },
                {
                    address: 'SbohWtoVmSXgHyieqm8BnujDoVa7VjfQz7',
                    category: 'receive',
                    amount: 65.95174701,
                    label: '',
                    vout: 2,
                    confirmations: 5106,
                    blockhash: '0000000000000277bddcc9a5e8826c25b50e708ba98764079547491c7324379e',
                    blockindex: 2,
                    blocktime: 1602656946,
                    txid: '0e8cb687e135433fd0abf0d3d8ff2b48252db3f8ff8644b33eae92cb4a07bae1',
                    walletconflicts: [],
                    time: 1602656646,
                    timereceived: 1602656646,
                    'bip125-replaceable': 'no'
                },
                {
                    address: 'SbohWtoVmSXgHyieqm8BnujDoVa7VjfQz7',
                    category: 'receive',
                    amount: 9.36478865,
                    label: '',
                    vout: 1,
                    confirmations: 5102,
                    blockhash: '000000000000057c701df724cedc410073e9c3bd95994841ad26c895ddf1d68a',
                    blockindex: 1,
                    blocktime: 1602657370,
                    txid: '5af48af3d147dc1b641eaaeab56f61265ae53332bf066fb3d7fd043db4f043dd',
                    walletconflicts: [],
                    time: 1602657258,
                    timereceived: 1602657258,
                    'bip125-replaceable': 'no'
                },
                {
                    address: 'SbohWtoVmSXgHyieqm8BnujDoVa7VjfQz7',
                    category: 'receive',
                    amount: 68.17750156,
                    label: '',
                    vout: 1,
                    confirmations: 4412,
                    blockhash: '00000000000003fe28753767a716638f07a60da05460869a62c1283f04ba6a2d',
                    blockindex: 1,
                    blocktime: 1602740317,
                    txid: 'b4d70b5273d2b235916d4f93983d1ad34624b65dc9618c9c6fc40ceab8952d5e',
                    walletconflicts: [],
                    time: 1602740166,
                    timereceived: 1602740166,
                    'bip125-replaceable': 'no'
                },
                {
                    address: 'SbohWtoVmSXgHyieqm8BnujDoVa7VjfQz7',
                    category: 'receive',
                    amount: 50.9731368,
                    label: '',
                    vout: 3,
                    confirmations: 4406,
                    blockhash: '000000000000026aa40125af73e38f84cd60e8a5225da5bf978c320f59fc2760',
                    blockindex: 1,
                    blocktime: 1602740895,
                    txid: '79621c8ea3c8028fcddf309068aebb364a3f0ebb0ae9a99a45a0a79d0139846a',
                    walletconflicts: [],
                    time: 1602740775,
                    timereceived: 1602740775,
                    'bip125-replaceable': 'no'
                },
                {
                    address: 'Sj5HhvHuHfUiZhF3y8xpSc7VU9UnFaTUAn',
                    category: 'receive',
                    amount: 1,
                    label: '',
                    vout: 1,
                    confirmations: 2490,
                    blockhash: '000000000000032801513835b269444ae5f8929b20c68c96e7bc0a53c634fa71',
                    blockindex: 1,
                    blocktime: 1602972522,
                    txid: 'f45cf9f23e2240fc4f6477b2fae868b40735231507a86d2fac9ad1d6cc208fcd',
                    walletconflicts: [],
                    time: 1602972391,
                    timereceived: 1602972391,
                    'bip125-replaceable': 'no'
                }
            ]

            for (var i = 0; i < transactionList.length; i++) {
                var pushObject = {};
                var amount = 0.0;
                // console.log("transactionList[i].amount < 0", transactionList[i].amount < 0);
                // console.log("Math.abs(transactionList[i].amount)", Math.abs(transactionList[i].amount))
                if (transactionList[i].amount > 0) {
                    amount = Math.abs(transactionList[i].amount)
                } else {
                    amount = Math.abs(transactionList[i].amount)
                }
                // console.log("amount", amount)
                pushObject = {
                    type: transactionList[i].category,
                    baseValue: (transactionList[i].amount > 0) ? (transactionList[i].amount) : (Math.abs(transactionList[i].amount)),
                    baseValueString: (transactionList[i].amount > 0) ? (transactionList[i].amount) : (Math.abs(transactionList[i].amount)),
                    coin: coinData.coin_code,
                    createdTime: moment(transactionList[i].time).format("DD-MM-YYYY h:mm:ss"),
                    date: moment(transactionList[i].time).format("DD-MM-YYYY h:mm:ss"),
                    entries: transactionList[i].conflicts,
                    feeString: (transactionList[i].category == "send") ? (- (transactionList[i].fee)) : (0.0),
                    normalizedTxHash: (transactionList[i].txid),
                    txid: (transactionList[i].txid),
                    usdRate: (coinFiatValue != undefined && coinFiatValue.quote != undefined) ? (coinFiatValue.quote["USD"].price) : (0.0),
                    usd: (coinFiatValue != undefined && coinFiatValue.quote != undefined) ? ((amount) * coinFiatValue.quote["USD"].price) : (0.0),
                    value: Number(parseFloat(amount * coinData.coin_precision).toFixed(8)),
                    valueString: (amount * coinData.coin_precision).toString(),
                    wallet: "bc1q0kvfwzxqw7geguwwr4rgdwa39z9lpwqlue9frk"
                }
                transfers.push(pushObject)
            }
            responseObject.coin = coinData.coin_code;
            responseObject.transfers = transfers;
            return res
                .status(200)
                .json({
                    "status": 200,
                    "data": responseObject
                })
        } catch (error) {
            console.log("error", error)
        }
    }

    async healthCheck(req, res) {
        try {

            var system_health = await AdminSettingModel
                .query()
                .first()
                .select()
                .where("deleted_at", null)
                .andWhere("slug", "system_health")
                .orderBy("id", "DESC");

            if (system_health && system_health.value == "ok_from_db") {
                return res.status(200).json({
                    "status": 200,
                    "message": "System Health is Good.",
                })
            } else {
                return res.status(500).json({
                    "status": 500,
                    "message": "System Health is Not Good."
                })
            }

        } catch (error) {
            console.log("error", error);
            return res.status(500).json({
                "status": 500,
                "message": "System Health is Not Good.",
                error_at: error.stack
            })
        }
    }
}


module.exports = new UsersController();