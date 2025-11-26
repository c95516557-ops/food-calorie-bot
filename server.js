require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Ключ из переменной окружения
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

// Рабочая модель на ноябрь 2025 (поддерживает фото и бесплатно)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-preview-09-2025"
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница Mini App
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка фото
app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Нет фото' });
    }

    const prompt = `Ты — эксперт по питанию. Проанализируй фото еды и ответь ТОЛЬКО в JSON (без лишнего текста и без Markdown):

{
  "dish": "название блюда",
  "calories": 450,
  "protein": 25,
  "fat": 18,
  "carbs": 55,
  "recipes": [
    "Рецепт 1: короткое описание в 1 предложение",
    "Рецепт 2: короткое описание в 1 предложение",
    "Рецепт 3: короткое описание в 1 предложение"
  ]
}`;

    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: imageBase64.includes('png') ? 'image/png' : 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();

    // Убираем возможные ```json и ```
    text = text.replace(/```json|```/g, '').trim();

    const data = JSON.parse(text);

    res.json({ success: true, data });

  } catch (error) {
    console.error('Ошибка Gemini:', error.message);
    res.status(500).json({ success: false, error: 'Не удалось распознать еду' });
  }
});

app.listen(PORT, () => {
  console.log(`Бот запущен! Порт: ${PORT}`);
  console.log(`Ссылка: https://food-calorie-bot-2edm.onrender.com`);
});
