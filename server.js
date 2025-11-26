require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-preview-09-2025" 
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Анализ фото (как было)
app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Нет фото' });

    const prompt = `Ты — эксперт по питанию. Проанализируй фото и ответь ТОЛЬКО в JSON:

{
  "dish": "название блюда",
  "calories": 450,
  "protein": 25,
  "fat": 18,
  "carbs": 55,
  "recipes": ["Рецепт 1...", "Рецепт 2...", "Рецепт 3..."]
}`;

    const imagePart = { inlineData: {
      data: imageBase64.split(',')[1],
      mimeType: imageBase64.includes('png') ? 'image/png' : 'image/jpeg'
    }};

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(text);

    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Ошибка анализа' });
  }
});

// Новый эндпоинт — продолжение чата
app.post('/chat', async (req, res) => {
  try {
    const { history } = req.body;
    const result = await model.generateContent(history);
    const reply = result.response.text();
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ reply: 'Извини, не смог ответить :(' });
  }
});

app.listen(PORT, () => {
  console.log(`Food'oGram запущен! Порт: ${PORT}`);
});
