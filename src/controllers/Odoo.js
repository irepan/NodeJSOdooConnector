import OdooRpc from "odoo-xmlrpc";

/*
new OdooRpc({
    url: process.env.ODOO_URL,
    db: process.env.ODOO_DB,
    username: "",
    password: "",
    port: ""
  });
*/

class OdooSingleton {
  odoo = null;
  valid = false;
  odooParams = {};
  constructor() {
    this.AuthController = AuthController;
  }

  init = async ({ url, db, username, password, port }) =>
    new Promise(function(resolve, reject) {
      if (!url || !db || !username || !password) {
        reject("Need valid values to initialize");
        return;
      }
      const odoo = new OdooRpc({ url, db, username, password, port });
      odoo.connect(err => {
        if (err) {
          this.valid = false;
          this.odoo = null;
          this.odooParams = {};
          reject("Invalid initializarion parameters");
          return;
        }
        this.valid = true;
        this.odoo = odoo;
        odooParams = { url, db, username, password, port };
        resolve("OK");
      });
    });
  execute_kw = (model, method, params) =>
    new Promise((resolve, reject) => {
      if (!this.valid) {
        reject("Odoo needs to be initialized using init method");
        return;
      }

      this.odoo.connect(err => {
        if (err) {
          reject("Unable to connect to odoo instance");
          return;
        }
        this.odoo.execute_kw(model, method, params, (error, value) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(value);
        });
      });
    });

  getOdooConnector = ({ email: username, password }) => {
    if (!this.valid) {
      throw "Odoo needs to be initialized using init method";
    }
    const { url, db, port } = this.odoo;
    return new OdooRpc({ url, db, username, password, port });
  };
}
const Odoo = new OdooSingleton();
export default Odoo;
