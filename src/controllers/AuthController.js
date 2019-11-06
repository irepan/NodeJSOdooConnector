const Helper = require('../helpers/Helper');
const Odoo = require('./Odoo');

const loginUser = (email, password) => {
	return new Promise(function(resolve, reject) {
		if (!email || !password) {
			reject({ error: 'Values are missing' });
			return;
		}
		if (!Helper.isValidEmail(email)) {
			reject({ error: 'Email format is invalid' });
			return;
		}
		const odoo = Odoo.getOdooConnector({ email, password });
		odoo.connect(err => {
			if (err) {
				reject({ error: err.message });
				return;
			}
			const params = [];
			params.push([['login', '=', email]]);
			params.push(['id']);
			params.push(0);
			params.push(1);
			odoo.execute_kw(
				'res.users',
				'search_read',
				[params],
				(error, value) => {
					if (error) {
						reject({ error });
						return;
					}
					if (!value[0] || !value[0].id) {
						reject({
							error: 'Usuario no encontrado en la base de datos'
						});
						return;
					}
					const id = value[0].id;
					const token = Odoo.tokenGenerator(id, email);
					if (!token) {
						reject({ error: 'Error al crear token' });
						return;
					}
					resolve({ value: token });
					return;
				}
			);
		});
	});
};

const createUser = function(name, email, password) {
	return new Promise(async function(resolve, reject) {
		if (!Odoo.valid) {
			reject('Odoo needs to be initialized using init method');
			return;
		}
		if (!email || !password) {
			reject({ error: 'Values are missing' });
			return;
		}

		if (!Helper.isValidEmail(email)) {
			reject({ error: 'Email format is invalid' });
			return;
		}

		console.log('Creating new user...');

		var params = [];

		params.push({
			name: name,
			login: email,
			password: password
		});

		await Odoo.execute_kw('res.users', 'create', [params])
			.then(value => {
				resolve({ message: value });
				return;
			})
			.catch(err => {
				reject({ error: err });
				return;
			});
	});
};

module.exports = {
	loginUser,
	createUser
};
