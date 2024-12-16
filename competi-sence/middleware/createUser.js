//var User = require("./../models/User").User
var db = require('../mySQLConnect.js');
module.exports = function(req,res,next) {
res.locals.user = null
console.log('Проверяем сессию')
console.log(req.session.user)
db.query(`SELECT * FROM account WHERE account.id = '${req.session.user}'`, (err,
users) => {
if(err)
return next(err)
if(users.length > 0) {
res.locals.user = users[0];
}
next()
})
}