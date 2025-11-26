require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Обязательно берём ключ из переменной окружения
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

// Актуальная стабильная модель на ноябрь 2025 (поддерживает фото, бесплатная до 1M токенов/месяц)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: 'v1' });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница Mini App
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Эндпоинт для анализа фото
app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;  // Исправил на imageBase64, как в фронте

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Нет изображения' });
    }

    const prompt = `Ты — эксперт по питанию и шеф-повар. Проанализируй фото еды и ответь **ТОЛЬКО** в строгом JSON-формате (ничего лишнего, без Markdown или текста вне JSON):

{
  "dish": "точное название блюда или продуктов",
  "calories": 450,
  "protein": 25,
  "fat": 18,
  "carbs": 55,
  "recipes": [
    "Рецепт 1: короткое описание на 1 предложение",
    "Рецепт 2: короткое описание на 1 предложение",
    "Рецепт 3: короткое описание на 1 предложение"
  ]
}

Оцени вес порции реалистично (на основе фото). Используй базу USDA для калорий и БЖУ.`;

    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1],  // Убираем data:image/...;base64,
        mimeType: imageBase64.includes('png') ? 'image/png' : 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text().replace(/```json|```/g, '').trim();  // Чистим от Markdown

    const data = JSON.parse(text);  // Парсим JSON

    res.json({ success: true, data });
  } catch (error) {
    console.error('Ошибка Gemini:', error.message);
    res.status(500).json({ success: false, error: 'Не удалось распознать еду. Попробуй другое фото или проверь ключ.' });
  }
});

app.listen(PORT, () => {
  console.log(`Бот запущен! Сервер работает на порту ${PORT}`);
  console.log(`Mini App доступен по адресу: https://food-calorie-bot-2edm.onrender.com`);
});
