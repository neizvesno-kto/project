const axios = require('axios');
const db = require('../mySQLConnect.js'); // Используем существующее подключение

// Добавьте ваш API-ключ сюда
const API_KEY = 'AQVN2peKOBidDpF38Q4yV34mUMeTJh1DHBzH1ZJy'; // Замените на свой API-ключ

async function getResponseFromYandexGPT(prompt) {
  try {
    const modelUri = 'gpt://b1gnc2nukk2td1ejmcj8/yandexgpt-lite'; // Убедитесь, что это корректный идентификатор

    const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      modelUri: modelUri,
      completionOptions: {
        stream: false,
        temperature: 0.2,
        maxTokens: 5000
      },
      messages: [
        {
          role: "system",
          text: "проведи анализ конкурентов"
        },
        {
          role: "user",
          text: prompt // передаем текст из аргумента функции
        }
      ]
    }, {
      headers: {
        Authorization: `Api-Key ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    // Логируем весь ответ для понимания, что приходит
    console.log('Ответ от API:', response.data);

    // Проверка на наличие альтернатив в ответе и извлечение текста
    if (response.data && response.data.result && response.data.result.alternatives && response.data.result.alternatives.length > 0) {
      const alternative = response.data.result.alternatives[0];  // Получаем первый альтернативный ответ
      const resultText = alternative.message.text.trim();  // Извлекаем исправленный текст
      console.log('Исправленный текст от GPT:', resultText);  // Логируем результат
      return resultText;
    } else {
      throw new Error('Некорректный ответ от API Яндекс.GPT: нет alternatives или пустой список.');
    }
  } catch (error) {
    // Логируем ошибку, если что-то пошло не так
    console.error('Ошибка при запросе к Яндекс.GPT:', error.response?.data || error.message);
    throw error;
  }
}

// Функция для получения бизнесов из базы данных
async function getBusinessesFromDB() {
  try {
    // Оборачиваем подключение в промисы
    const promiseDb = db.promise();
    const [rows] = await promiseDb.query('SELECT * FROM businesses'); // Таблица "businesses"
    return rows;
  } catch (error) {
    console.error('Ошибка при получении данных о бизнесах:', error.message);
    throw error;
  }
}

module.exports = {
  getResponseFromYandexGPT,
  getBusinessesFromDB,
};
