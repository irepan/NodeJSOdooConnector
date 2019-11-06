var Odoo = require('./src/controllers/Odoo');
const AuthController = require('./src/controllers/AuthController');
const HelloWorld = () => {
	return 'Hello World';
};

module.exports = {
	HelloWorld,
	init: Odoo.init,
	AuthController
};
