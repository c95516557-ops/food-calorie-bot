require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Обязательно берём ключ из переменной окружения
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

// Актуальная preview-модель на ноябрь 2025 (поддерживает фото, бесплатная)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" }, { apiVersion: 'v1' });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница Mini App
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Эндпоинт для анализа фото
app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Нет изображения' });
    }

    const prompt = `Ты — эксперт по питанию. Проанализируй фото еды и ответь ТОЛЬКО в JSON-формате (без текста вне JSON):

{
  "dish": "точное название блюда",
  "calories": 450,
  "protein": 25,
  "fat": 18,
  "carbs": 55,
  "recipes": [
    "Рецепт 1: короткое описание",
    "Рецепт 2: короткое описание",
    "Рецепт 3: короткое описание"
  ]
}

Оцени вес порции реалистично. Используй базу USDA для точных калорий и БЖУ.`;

    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: imageBase64.includes('png') ? 'image/png' : 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text().replace(/```json:disable-run
    const data = JSON.parse(text);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Ошибка Gemini:', error.message);
    res.status(500).json({ success: false, error: 'Не удалось распознать. Попробуй другое фото.' });
  }
});

app.listen(PORT, () => {
  console.log(`Бот запущен! Сервер работает на порту ${PORT}`);
  console.log(`Mini App: https://food-calorie-bot-2edm.onrender.com`);
});
