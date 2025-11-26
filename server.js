require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT ||  || 3000;

// Обязательно берём ключ из переменной окружения
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

// Самая актуальная и быстрая модель на ноябрь 2025, отлично работает с фото
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
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Нет изображения' });
    }

    const prompt = `
Ты — эксперт по питанию. Проанализируй фото еды и ответь строго в таком формате (ничего лишнего):

Блюдо: точное название
Калории: число ккал
Белки: число г
Жиры: число г
Углеводы: число г

Ещё 3 простых рецепта из похожих ингредиентов (по одному предложению каждый):
1. …
2. …
3. …
`;

    const imageParts = [
      {
        inlineData: {
          data: image.split(',')[1], // убираем data:image/jpeg;base64,
          mimeType: image.includes('jpeg') || image.includes('jpg') ? 'image/jpeg' : 'image/png'
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    res.json({ result: text.trim() });

  } catch (error) {
    console.error('Ошибка Gemini:', error.message);
    res.status(500).json({ error: 'Не удалось распознать еду. Попробуй другое фото.' });
  }
});

app.listen(PORT, () => {
  console.log(`Бот запущен! Сервер работает на порту ${PORT}`);
  console.log(`Mini App доступен по адресу: https://food-calorie-bot-2edm.onrender.com`);
});
