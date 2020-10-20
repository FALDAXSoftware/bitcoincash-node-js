// Auth Middleware for validate Token and Client Key
var jwt = require('jwt-simple');
const constants = require('../config/constants');
var i18n = require("i18n");
var Helper = require("../helpers/helpers");
const v = require('node-input-validator');
var UserModel= require('../models/cms/UsersModel');

module.exports = async function (req, res, next) {
	let validator = new v(req.headers, {
		"x-access-token": 'required',
		// "client_key": 'required'
	});
	await validator.check()
		.then(function (matched) {
			if (!matched) {
				for (var key in validator.errors) {
					return Helper.jsonFormat(res, constants.BAD_REQUEST_CODE, i18n.__("TOKEN_EXPIRED"), []);
				}
			}
		});
	// Check authentication 
	var token = req.headers['x-access-token'];
	// var client_key = req.headers['client_key'];

	try {
		var decoded = jwt.decode(token, require('../config/secret')());
		if (decoded.exp <= Date.now()) {
			return Helper.jsonFormat(res, constants.BAD_REQUEST_CODE, i18n.__("TOKEN_EXPIRED"), []);
		}

		// Authorize the user to see if s/he can access our resources
		var validateClientKey = await UserModel.checkClientKey( decoded.id, decoded.client_key );
		if ( validateClientKey ) {
			req.session.user_id = decoded.id;
			req.session.role_id = decoded.role_id;
			next();
		} else {			
			return Helper.jsonFormat(res, constants.UNAUTHORIZED_CODE, i18n.__("UNAUTHORIZED_ACCESS"), []);			
		}
	} catch (err) {
		return Helper.jsonFormat(res, constants.UNAUTHORIZED_CODE, i18n.__("UNAUTHORIZED_ACCESS"), []);
	}

}