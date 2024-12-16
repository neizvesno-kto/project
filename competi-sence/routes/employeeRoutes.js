const express = require('express');
const db = require('../mySQLConnect');  // Подключаем базу данных
const router = express.Router();

// Функция для получения сотрудников из базы данных
function getEmployees(callback) {
  db.query(`
    SELECT e.employee_id, e.name, e.position, e.salary, b.companyName 
    FROM employees e
    JOIN businesses b ON e.Businesses_business_id = b.business_id
  `, function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, results);
  });
}

// Маршрут для отображения сотрудников
router.get('/employees', function(req, res, next) {
  getEmployees(function(err, employees) {
    if (err) {
      return next(err);
    }
    res.render('employees', { title: 'Сотрудники', employees: employees });
  });
});

// Маршрут для отображения формы добавления сотрудника
router.get('/addEmployee', function(req, res) {
  // Запрос для получения всех бизнесов, чтобы привязать сотрудника
  db.query('SELECT * FROM businesses', function(err, businesses) {
    if (err) {
      return res.status(500).send('Ошибка при получении бизнесов');
    }
    res.render('addEmployee', { title: 'Добавить сотрудника', businesses: businesses });
  });
});

// Маршрут для обработки добавления сотрудника
router.post('/addEmployee', function(req, res, next) {
  const { name, position, salary, business_id } = req.body;

  // Проверяем обязательные поля
  if (!name || !position || !salary || !business_id) {
    return res.status(400).send('Все поля обязательны для заполнения');
  }

  // SQL-запрос для вставки нового сотрудника
  const sql = 'INSERT INTO employees (Businesses_business_id, name, position, salary) VALUES (?, ?, ?, ?)';
  db.query(sql, [business_id, name, position, salary], function(err, result) {
    if (err) {
      return next(err);
    }
    res.redirect('/employees');  // Перенаправляем на страницу с сотрудниками
  });
});

module.exports = router;
