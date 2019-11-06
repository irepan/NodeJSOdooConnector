const JWT = require('jsonwebtoken');
const UIDGenerator = require('uid-generator');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const SECRET_KEY = process.env.SECRET_KEY;
const uidgen = new UIDGenerator();

const isValidEmail = email => {
	return /\S+@\S+\.\S+/.test(email);
};

const generateToken = (id, email) => {
	const token = JWT.sign(
		{
			id: id,
			email: email
		},
		SECRET_KEY,
		{ expiresIn: '7d' }
	);

	return token;
};

const readUserId = (db, user) => {
	return new Promise(function(resolve, reject) {
		var params = [];

		params.push([['login', '=', user]]);
		params.push(['id']);
		params.push(0);
		params.push(1);

		db.execute_kw('res.users', 'search_read', [params], function(
			err,
			value
		) {
			if (err) {
				reject(err);
				return;
			}
			if (!value[0]) {
				reject('Usuario no encontrado en la base de datos');
				return;
			}
			resolve(value[0].id);
		});
	});
};

const generateUID = () => {
	return uidgen.generateSync();
};

const sendEmail = (email, token) => {
	var url = 'http://www.test.com/' + token;
	const msg = {
		to: email,
		from: process.env.ODOO_USR,
		subject: 'Password change',
		text: 'Change your password here: ' + url
	};
	sgMail.send(msg);
};

const exec_kw = (db, model, method, params) => {
	return new Promise(function(resolve, reject) {
		db.execute_kw(model, method, params, function(err, value) {
			if (err) {
				reject(err);
				return;
			}
			resolve(value);
		});
	});
};

module.exports = {
	isValidEmail,
	generateToken,
	readUserId,
	generateUID,
	sendEmail,
	exec_kw
};
