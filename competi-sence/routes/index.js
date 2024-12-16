var checkAuth = require("./../middleware/checkAuth.js")
const express = require('express');
const router = express.Router();
const db = require('../mySQLConnect.js');
const axios = require('axios');
const { getResponseFromYandexGPT } = require('../routes/gptService'); // Логика GPT
const { getBusinessesFromDB, saveBusinessToDB } = require('./dbService'); // Логика работы с БД
const moment = require('moment'); // Убедитесь, что у вас установлен момент







// Обработчик GET-запроса для получения бизнесов
router.get('/', function(req, res, next) {
  db.query('SELECT * FROM businesses', function(err, businesses) {
    if (err) {
      console.error('Ошибка при получении бизнесов:', err);
      return next(err);
    }
    res.render('index.ejs', { title: 'главнаястраница', businesses: businesses });
  });
});

// Обработчик POST-запроса для добавления нового бизнеса
router.post('/', function(req, res, next) {
  const companyName = req.body.companyName;
  const industry = req.body.industry;
  const discription = req.body.discription; // Поле для описания бизнеса
  const region = req.body.region; // Новое поле для региона
  const business_id = req.body.business_id;
  const Account_id = req.session.user;

  // Проверяем, чтобы все поля были заполнены
  if (!companyName.trim() || !industry.trim() || !discription.trim() || !region.trim()) {
    return res.status(400).send('Пожалуйста, заполните все поля');
  }

  // Добавляем бизнес в базу данных
  db.query(
    `INSERT INTO businesses (business_id, companyName, industry, discription, region, Account_id) VALUES (?, ?, ?, ?, ?, ?)`, 
    [business_id, companyName, industry, discription, region, Account_id],
    function(err, result) {
      if (err) {
        console.error('Ошибка при добавлении бизнеса:', err);
        return next(err);
      }
      // Перенаправляем на страницу /competitors после успешного добавления
      res.redirect('/competitors');
    }
  );
});








router.get('/cabinet', function (req, res, next) {
  // SQL-запрос для получения данных о текущем пользователе
  const query = 'SELECT username, phone_number FROM account'; // Предполагается, что у вас есть идентификатор пользователя
  const userId = req.session.userId; // Идентификатор текущего пользователя из сессии (пример)

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Ошибка выполнения запроса:', err);
      return res.status(500).send('Ошибка сервера');
    }

    // Передаем данные в шаблон (если пользователь найден)
    const account = results.length > 0 ? results[0] : null;
    res.render('cabinet', { 
      title: 'Личный кабинет', 
      account 
    });
  });
});






router.get('/competitors', function(req, res, next) {
  const userAccountId = req.session.user; // Извлекаем account_id авторизованного пользователя

  // Запрос в базу данных с фильтрацией по account_id
  db.query('SELECT * FROM businesses WHERE Account_Id = ?', [userAccountId], function(err, businesses) {
    if (err) {
      console.error('Ошибка при получении бизнесов:', err);
      return next(err);
    }

    // Отправляем данные на страницу
    res.render('competitors.ejs', { title: 'Конкуренты', businesses: businesses });
  });
});









router.get('/registration', async function(req, res, next) {
  res.render('registration', { title: 'Вход', error: null });
});
router.post('/registration', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var phoneNumber = req.body.phone_number; // Получаем номер телефона из формы
  
  db.query(`SELECT * FROM account WHERE username = '${username}'`, function(err, users) {
    if (err) return next(err);
    if (users.length > 0) {

      // Пользователь существует
      var user = users[0];
      if (password == user.password) {
        req.session.user = user.id;

        // Если admin
        if (username === 'admin' && password === 'admin') {
          res.redirect('/registration');
        } else {
          res.redirect('/');
        }
      } else {
        
        // Неверный пароль
        res.render('registration', { title: 'Вход', error: "Пользователь с таким логином уже существует!" });
      }
    } else {
      // Пользователь не существует, добавляем нового
      db.query(`INSERT INTO account (username, password, phone_number) VALUES ('${username}', '${password}', '${phoneNumber}')`, function(err, result) {
        if (err) return next(err);
        req.session.user = result.insertId; // Используйте insertId для получения ID нового пользователя
        res.redirect('/');
      });
    }
  });
});







// Функция для получения отзывов
function getCustomerFeedback(callback) {
  db.query('SELECT * FROM customer_feedback', function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, results);
  });
}

router.get('/otziv', function(req, res, next) {
  getCustomerFeedback(function(err, customer_feedback) {
    if (err) {
      return next(err);
    }

    // Получаем текущую дату в формате 'YYYY-MM-DD'
    const currentDate = moment().format('YYYY-MM-DD');

    res.render('otziv', { title: 'Отзывы', customer_feedback: customer_feedback, currentDate: currentDate });
  });
});
router.post('/otziv', (req, res) => {
  const { date, rating, comment } = req.body;
  const Account_id = req.session.user; // Получаем Account_id из сессии

  // Проверка на наличие обязательных полей
  if (!rating || !comment) {
      return res.status(400).send('Все поля обязательны для заполнения');
  }

  // SQL-запрос для вставки данных в таблицу
  const sql = 'INSERT INTO customer_feedback (Account_id, date, rating, comment) VALUES (?, ?, ?, ?)';
  db.query(sql, [Account_id, date, rating, comment], (err, result) => {
      if (err) {
          console.error('Ошибка при вставке данных: ' + err.stack);
          return res.status(500).send('Ошибка при вставке данных');
      }
      res.redirect('/otziv');
  });
});











// GET: Отображение отчёта
router.get('/otchet', async (req, res) => {
  try {
      const connection = req.app.get('connection'); // Используем пул соединений, заданный в app.js
      const businesses = await getBusinessesFromDB(connection); // Получаем список бизнесов из БД

      const gptResponses = [];
      for (const business of businesses) {
        const prompt = `Компания: ${business.companyName}, Отрасль: ${business.industry}, Описание: ${business.description}, Регион: ${business.region}. Проанализируй компанию ${business.companyName} с точки зрения конкуренции. Сравни её с конкурентами в этом регионе, выяви ключевые конкуренты и проанализируй, чем они отличаются по следующим аспектам:
1. Ассортимент товаров и услуг.
2. Ценовая политика и акции.
3. Сила бренда и маркетинг.
4. Уровень обслуживания клиентов.
5. Рынок и географическое присутствие.

Проанализируй, как ${business.companyName} может улучшить свои позиции по сравнению с этими конкурентами.`;

          // Запрос к Яндекс GPT
          const response = await getResponseFromYandexGPT(prompt);
          gptResponses.push({
              companyName: business.companyName,
              industry: business.industry,
              description: business.description,
              region: business.region, // Добавляем регион в вывод
              analysis: response, // Ответ от GPT
          });
      }

      // Рендерим страницу с отчётами
      res.render('otchet', { title: 'Отчёт', results: gptResponses });
  } catch (err) {
      console.error('Ошибка при обработке запроса:', err);
      res.status(500).send('Произошла ошибка при обработке запроса.');
  }
});

// POST: Передача данных из businesses в Яндекс GPT
router.post('/business', async (req, res) => {
  try {
      const { companyName, industry, description, region } = req.body; // Получаем данные из тела запроса

      if (!companyName || !industry || !description || !region) {
          return res.status(400).send('Не указаны необходимые данные: companyName, industry, description или region.');
      }

      // Сохраняем данные в БД
      const connection = req.app.get('connection');
      await saveBusinessToDB(connection, { companyName, industry, description, region });

      // Формируем запрос к Яндекс GPT
      const prompt = `Компания: ${business.companyName}, Отрасль: ${business.industry}, Описание: ${business.description}, Регион: ${business.region}. Проанализируй компанию ${business.companyName} с точки зрения конкуренции. Сравни её с конкурентами в этом регионе, выяви ключевые конкуренты и проанализируй, чем они отличаются по следующим аспектам:
1. Ассортимент товаров и услуг.
2. Ценовая политика и акции.
3. Сила бренда и маркетинг.
4. Уровень обслуживания клиентов.
5. Рынок и географическое присутствие.

Проанализируй, как ${business.companyName} может улучшить свои позиции по сравнению с этими конкурентами.`;

      const response = await getResponseFromYandexGPT(prompt);

      // Возвращаем результат клиенту
      res.status(201).json({
          message: 'Данные успешно сохранены и обработаны.',
          companyName,
          industry,
          description,
          region,
          analysis: response, // Ответ от GPT
      });
  } catch (err) {
      console.error('Ошибка при обработке POST запроса:', err);
      res.status(500).send('Произошла ошибка при обработке данных.');
  }
});








// Маршрут для отображения трендов
router.get('/trends', async function(req, res, next) {
  try {
      // Пример трендов, полученных от нейросети
      const trends = [
          { title: "Тренд 1: Искусственный интеллект в бизнесе", description: "В 2024 году искусственный интеллект будет активно внедряться в различные бизнес-процессы для повышения их эффективности и автоматизации." },
          { title: "Тренд 2: Устойчивое развитие и экологичность", description: "С каждым годом растёт важность экологических инициатив, устойчивых продуктов и энергоэффективных технологий." },
          { title: "Тренд 3: Персонализация потребительского опыта", description: "Компании будут использовать данные о клиентах для создания персонализированных предложений и улучшения взаимодействия с клиентами." },
          { title: "Тренд 4: Блокчейн в различных отраслях", description: "Технология блокчейн будет широко использоваться для обеспечения безопасности данных, автоматизации процессов и улучшения финансовых транзакций." },
          { title: "Тренд 5: Увлажнение и здоровый образ жизни", description: "В 2024 году спрос на продукты, связанные со здоровым образом жизни, будет расти, особенно в сфере питания и фитнеса." }
      ];

      // Рендерим страницу с трендами
      res.render('trends', { title: 'Тренды 2024', trends: trends });

  } catch (err) {
      console.error('Ошибка при получении трендов:', err);
      res.status(500).send('Произошла ошибка при получении трендов.');
  }
});







// Функция для получения сотрудников с возможностью сортировки
function getEmployees(sortBy, callback) {
  let orderClause = '';
  if (sortBy === 'salary') {
    orderClause = 'ORDER BY e.salary ASC'; // Сортировка по зарплате
  } else if (sortBy === 'company') {
    orderClause = 'ORDER BY b.companyName ASC'; // Сортировка по компании
  }

  db.query(`
    SELECT e.employee_id, e.name, e.position, e.salary, b.companyName 
    FROM employees e
    JOIN businesses b ON e.Businesses_business_id = b.business_id
    ${orderClause}
  `, function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, results);
  });
}

// Маршрут для отображения сотрудников с сортировкой
router.get('/employees', function(req, res, next) {
  const sortBy = req.query.sortBy || ''; // Получаем параметр сортировки из URL (по умолчанию пусто)
  
  getEmployees(sortBy, function(err, employees) {
    if (err) {
      return next(err);
    }
    res.render('employees', { title: 'Сотрудники', employees: employees, sortBy: sortBy });
  });
});



















router.get('/about', function(req, res, next) {
  res.render('about', { title: 'О нас' });
});

router.get('/welcome', async function(req, res, next) {
  res.render('welcome', { title: 'Привет', error: null });
});

router.get('/logreg', async function(req, res, next) {
  res.render('logreg', { title: 'Вход', error: null });
});

router.get('/sales', async function(req, res, next) {
  res.render('sales', { title: 'продажи', error: null });
});

router.post('/logout', function(req, res, next) {
  req.session.destroy()
  res.locals.user = null
  res.redirect('/')
});

// Предполагается, что у вас уже есть подключение к базе данных (db) и таблица корзины (cart), содержащая колонки id, user_id, medicine_id и quantity.


router.get('/', async (req, res, next) => {
  });


module.exports = router;