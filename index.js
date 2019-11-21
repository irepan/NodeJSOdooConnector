var Odoo = require('./src/controllers/Odoo');
const AuthController = require('./src/controllers/AuthController');
const ProjectController = require('./src/controllers/ProjectController');
const HelloWorld = () => {
	return 'Hello World';
};

module.exports = {
	HelloWorld,
	init: Odoo.init,
	AuthController,
	ProjectController
};
