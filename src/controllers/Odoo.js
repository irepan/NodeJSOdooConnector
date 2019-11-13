const OdooRpc = require('odoo-xmlrpc');
const Helper = require('../helpers/Helper');

const errorRegex = /.*odoo\.exceptions\.([^\:]*)\:.*'([^']*)'.*/g;

const matchException = /.*odoo\.exceptions\..*\:.*\('[^']*'.*\)/g;

const stripError = text => {
	var decoded = text.match(matchException).toString();
	if (!decoded || decoded.trim().length === 0) {
		return { type: 'Unknown', message: 'Unknown Exception' };
	}
	var exception = decoded.replace(errorRegex, '$1').toString();
	var message = decoded.replace(errorRegex, '$2').toString();
	return { type: exception, message: message };
};

class OdooSingleton {
	constructor() {
		this.odoo = null;
		this.valid = false;
		this.odooParams = {};
		this.init = this.init.bind(this);
		this.getOdooConnector = this.getOdooConnector.bind(this);
		this.execute_kw = this.execute_kw.bind(this);
	}

	async init({
		url,
		db,
		username,
		password,
		port,
		tokenGenerator = Helper.generateToken
	}) {
		try {
			this.odoo = await new Promise(function(resolve, reject) {
				if (!url || !db || !username || !password) {
					reject('Need valid values to initialize');
					return;
				}
				const odoo = new OdooRpc({ url, db, username, password, port });
				odoo.connect(err => {
					if (err) {
						reject(err.message);
						return;
					}
					resolve(odoo);
				});
			})
				.then(odoo => {
					return odoo;
				})
				.catch(err => {
					throw err;
				});
		} catch (err) {
			this.valid = false;
			this.odoo = null;
			this.odooParams = {};
			throw { error: err };
		}
		this.valid = true;
		this.odooParams = { url, db, username, password, port };
		this.tokenGenerator = tokenGenerator;
		return { status: 'OK' };
	}

	execute_kw(model, method, params, db) {
		return new Promise((resolve, reject) => {
			if (!this.valid) {
				reject('Odoo needs to be initialized using init method');
				return;
			}
			const odoo = db || this.odoo;
			odoo.connect(err => {
				if (err) {
					reject('Unable to connect to odoo instance');
					return;
				}
				this.odoo.execute_kw(model, method, params, (error, value) => {
					if (error) {
						if (error.faultString) {
							const { message } = stripError(error.faultString);
							reject(message);
							return;
						}
						reject(error);
						return;
					}
					resolve(value);
				});
			});
		});
	}
	getOdooConnector({ email: username, password }) {
		if (!this.valid) {
			throw 'Odoo needs to be initialized using init method';
		}
		const { url, db, port } = this.odooParams;
		return new OdooRpc({ url, db, username, password, port });
	}
}
var Singleton = (function() {
	var instance;

	function createInstance() {
		var object = new OdooSingleton();
		return object;
	}

	return {
		getInstance: function() {
			if (!instance) {
				instance = createInstance();
			}
			return instance;
		}
	};
})();
const Odoo = Singleton.getInstance();

module.exports = Odoo;
