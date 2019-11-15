const Helper = require('../helpers/Helper');
const Odoo = require('./Odoo');

const tokensModel = 'res.users.tokens';

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
				if (
					err.message.toString() ===
					'No UID returned from authentication.'
				) {
					reject({
						error: 'User or password are incorrect'
					});
					return;
				}
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
							error: 'User not found in DB'
						});
						return;
					}
					const id = value[0].id;
					resolve({ odooId: id, email });
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
				resolve({ odooId: value, email });
				return;
			})
			.catch(err => {
				reject({ error: err });
				return;
			});
	});
};

const findUserByEmail = function(email) {
	return new Promise(async function(resolve, reject) {
		if (!Odoo.valid) {
			reject('Odoo needs to be initialized using init method');
			return;
		}
		if (!email) {
			reject({ error: 'email value is missing' });
			return;
		}

		const params = [];

		params.push([['login', '=', email]]);
		params.push(['id']);
		params.push(0);
		params.push(1);
		await Odoo.execute_kw('res.users', 'search_read', [params])
			.then(value => {
				if (!value || !value[0]) {
					reject('User not found');
					return;
				}
				resolve({ id: value[0].id, email });
			})
			.catch(error => {
				console.log(error);
				reject(error);
			});
	});
};

const findUserById = function(id) {
	return new Promise(async function(resolve, reject) {
		if (!Odoo.valid) {
			reject('Odoo needs to be initialized using init method');
			return;
		}
		if (!id) {
			reject({ error: 'Values are missing' });
			return;
		}

		const params = [];

		params.push([['id', '=', id]]);
		params.push(['id', 'login']);
		params.push(0);
		params.push(1);

		await Odoo.execute_kw('res.users', 'search_read', [params])
			.then(value => {
				if (!value || !value[0]) {
					reject('User not found');
					return;
				}
				resolve({ id: value[0].id, email: value[0].login });
			})
			.catch(error => {
				console.log(error);
				reject(error);
			});
	});
};

const removeExistingUserTokens = function(email) {
	return new Promise(async (resolve, reject) => {
		const params = [];
		params.push([['mail', '=', email]]);
		params.push(['id']);
		params.push(0);
		params.push(10);
		await Odoo.execute_kw('res.users.tokens', 'search_read', [params])
			.then(async results => {
				const delParams = [];
				results.map(token => {
					delParams.push(token.id);
				});
				Odoo.execute_kw('res.users.tokens', 'unlink', [[delParams]])
					.then(value => {
						resolve(value);
					})
					.catch(error => {
						reject(error);
					});
			})
			.catch(error => {
				reject(error);
			});
	});
};

const generatePasswordResetToken = function(email) {
	return new Promise(async function(resolve, reject) {
		try {
			const user = findUserByEmail(email)
				.then(user => {
					return user;
				})
				.catch(error => {
					reject(error);
					return;
				});
			if (!user) {
				throw 'User with that email was not found on database';
			}
			await removeExistingUserTokens(email)
				.then(value => {
					return value;
				})
				.catch(error => {
					throw error;
				});
			const params = [];
			const token = {
				token: Helper.generateUID(),
				mail: email,
				expires: Date.now() + 1000 * 60 * 60 // 1 hr
			};
			params.push(token);
			await Odoo.execute_kw('res.users.tokens', 'create', [params])
				.then(() => {
					resolve({ token: token.token });
				})
				.catch(error => {
					throw error;
				});
		} catch (error) {
			reject({ error });
		}
	});
};

const retrieveResetToken = function(token) {
	return new Promise(async (resolve, reject) => {
		const params = [];
		params.push([['token', '=', token]]);
		params.push(['id', 'token', 'mail', 'expires']);
		params.push(0);
		params.push(10);
		await Odoo.execute_kw('res.users.tokens', 'search_read', [params])
			.then(results => {
				if (results.length < 1) {
					reject('Token does not exist');
					return;
				}
				const token = results[0];
				if (token.expires < Date.now()) {
					reject('Token already expired');
				}
				resolve(token);
				return token;
			})
			.catch(error => {
				reject(error);
			});
	});
};

const validatePasswordResetToken = function(token) {
	return new Promise((resolve, reject) => {
		retrieveResetToken(token)
			.then(result => {
				findUserByEmail(result.mail)
					.then(user => {
						resolve(user);
						return user;
					})
					.catch(error => {
						reject(error);
					});
			})
			.catch(error => {
				reject(error);
			});
	});
};

const changePassword = function(id, password) {
	return new Promise(async (resolve, reject) => {
		const findUser = findUserById(id)
			.then(user => {
				if (!user) {
					return { error: 'User with that ID was not found.' };
				}
				return { user, password };
			})
			.catch(error => {
				reject('User with that ID was not found.');
				return { error };
			});
		const modifyPassword = result => {
			if (!result) {
				return null;
			}
			console.log(result);
			const {
				user: { email },
				password,
				error
			} = result;
			if (error) {
				return error;
			}
			if (!password) {
				return { error: 'Password was not provided.' };
			}
			const params = [];
			params.push([id]);
			params.push({ password: password });
			return Odoo.execute_kw('res.users', 'write', [params])
				.then(() => {
					return { email };
				})
				.catch(error => {
					return { error };
				});
		};
		const removeTokens = result => {
			if (!result) {
				reject('There was a problem updating the password.');
				return null;
			}
			const { error, email } = result;
			if (error) {
				reject(error);
				return error;
			}
			return removeExistingUserTokens(email);
		};
		findUser
			.then(modifyPassword)
			.then(removeTokens)
			.then(result => {
				if (!result) {
					reject('There was a problem updating password.');
				}
				resolve('OK');
			})
			.catch(error => {
				reject(error);
			});
	});
};

const verifyUserTokenModel = function() {
	return new Promise(async (resolve, reject) => {
		await Odoo.execute_kw(tokensModel, 'fields_get', [
			[],
			{
				attributes: ['string', 'help', 'type']
			}
		])
			.then(values => {
				resolve(values);
			})
			.catch(error => {
				console.log('verifyUserTokenModel', error);
				if (error.faultString) {
					reject(error.faultString);
					return;
				}
				reject(error);
			});
	});
};

const createUserTokenModel = function() {
	const verifyModel = verifyUserTokenModel()
		.then(currentFields => {
			const fields = [];
			if (!currentFields.token) {
				fields.push('token');
			}
			if (!currentFields.mail) {
				fields.push('mail');
			}
			if (!currentFields.expires) {
				fields.push('expires');
			}
			return { create: false, fields };
		})
		.catch(error => {
			const { code } = error;
			if (code && code === 2) {
				return { create: true, fields: ['token', 'mail', 'expires'] };
			}
		});
	const createTokenModel = instructions => {
		if (!instructions) {
			return;
		}
		const { create, fields} = instructions;
		if (!create && fields.length===0) {
			return {id:null, fields};
		}
		return Odoo.execute_kw('ir.model', 'create', [
				{
					name: 'Reset Password Tokens Model',
					model: 'tokensModel',
					state: 'manual'
				}
			])
			.then(id => {
				return {id, fields}
			})
			.catch(error => {
				return {error};
			});
		};
	const createFields = 
};

module.exports = {
	loginUser,
	createUser,
	findUserById,
	findUserByEmail,
	generatePasswordResetToken,
	validatePasswordResetToken,
	changePassword,
	verifyUserTokenModel
};
