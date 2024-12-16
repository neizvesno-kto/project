const axios = require('axios');

// Ваш API ключ
const API_KEY = 'AQVN2peKOBidDpF38Q4yV34mUMeTJh1DHBzH1ZJy';

async function getResponseFromYandexGPT(prompt) {
    const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

    try {
        const response = await axios.post(
            url,
            {
                modelUri: "gpt://b1gnc2nukk2td1ejmcj8/yandexgpt-lite", // Указываем модель
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
                        text: prompt // Передаем текст, который нужно обработать
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Api-Key ${API_KEY}`,
                    'Content-Type': 'application/json',
                }
            }
        );

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
        console.error('Ошибка при запросе к Яндекс.GPT:', error.response?.data || error.message);
        throw error;
    }
}

// Функция для получения компаний из базы данных
async function getBusinessesFromDB(connection) {
    try {
        const [results] = await connection.query('SELECT companyName, industry, discription, region FROM businesses');
        return results;
    } catch (err) {
        console.error('Ошибка при запросе к базе данных:', err);
        throw err;
    }
}



module.exports = {
    getResponseFromYandexGPT,
    getBusinessesFromDB,
};
