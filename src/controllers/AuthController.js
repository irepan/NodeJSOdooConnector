import Helper from "../helpers/Helper";
import Odoo from "./Odoo";

const loginUser = ({ email, password }) => {
  return new Promise(function(resolve, reject) {
    if (!email || !password) {
      reject({ error: "Values are missing" });
      return;
    }

    if (!Helper.isValidEmail(email)) {
      reject({ error: "Email format is invalid" });
      return;
    }
    const odoo = Odoo.getOdooConnector({ email, password });
    odoo.connect(err => {
      if (err) {
        reject({ error: err });
        return;
      }
    });
  });
};

module.exports = {
  loginUser
};
