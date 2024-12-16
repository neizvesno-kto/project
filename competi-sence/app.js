var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var session = require("express-session");
var mysql2 = require('mysql2/promise');
var MySQLStore = require('express-mysql-session')(session);

// Подключаем маршруты
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var employeeRoutes = require('./routes/employeeRoutes');  // Подключаем новый маршрут для сотрудников

// Создаем экземпляр express
var app = express();

var options = {
  host: '127.0.0.1',
  port: '3306',
  user: 'root',
  password: '12345',
  database: 'com-sen'
};

var connection = mysql2.createPool(options);
var sessionStore = new MySQLStore(options, connection);

app.set('connection', connection);

// Настройки для отображения view
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs-locals'));

// Настройки сессий
app.use(session({
  secret: 'cafe_bars',
  key: 'sid',
  store: sessionStore,
  resave: true,
  saveUninitialized: true,
  cookie: {
      path: '/',
      httpOnly: true,
      maxAge: null // Устанавливаем максимальный срок действия сессии на null
  }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
  req.session.counter = req.session.counter + 1 || 1;
  next();
});

app.use(require("./middleware/createUser.js"));
app.use(require("./middleware/createMenu.js"));
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Подключаем маршруты сотрудников
app.use(employeeRoutes);  // Это подключает все маршруты из employeeRoutes.js


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error', { title: "Упс... что-то пошло не так" });
});

module.exports = app;
