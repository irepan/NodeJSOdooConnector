var Odoo = require('./src/controllers/Odoo');
const HelloWorld = () => {
	return 'Hello World';
};

module.exports = {
	HelloWorld,
	init: Odoo.init
};
