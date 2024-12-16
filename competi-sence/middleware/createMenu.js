const db = require('./../mySQLConnect');

module.exports = function(req, res, next) {
  res.locals.nav = [];
  db.query('SELECT companyName, industry, business_id FROM businesses', function(err, result) {
      if (err) throw err;
      res.locals.nav = result;
      next();
  });
};