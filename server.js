require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

// Самая стабильная модель на сегодня, которая точно принимает и фото, и чат
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  systemInstruction: "Ты — умный и дружелюбный помощник по питанию Food'oGram. Отвечай кратко и по-русски."
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Анализ фото
app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Нет фото' });

    const prompt = `Проанализируй фото еды и ответь ТОЛЬКО в JSON:

{
  "dish": "название блюда",
  "calories": 450,
  "protein": 25,
  "fat": 18,
  "carbs": 55,
  "recipes": ["Рецепт 1 в одном предложении", "Рецепт 2...", "Рецепт 3..."]
}`;

    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: imageBase64.includes('png') ? 'image/png' : 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(text);

    res.json({ success: true, data });
  } catch (e) {
    console.error('Analyze error:', e.message);
    res.status(500).json({ success: false, error: 'Не смог распознать' });
  }
});

// Чат — просто generateContent с полной историей (только текст)
app.post('/chat', async (req, res) => {
  try {
    const { history } = req.body;

    // Берём только текстовые сообщения из истории
    const textHistory = history
      .filter(msg => msg.role === 'user' || msg.role === 'model')
      .map(msg => msg.parts
        .filter(p => p.text)
        .map(p => ({ text: p.text }))
      ).flat();

    // Последнее сообщение пользователя
    const lastUserText = textHistory
      .filter(m => m.text && history.find(h => h.parts.some(p => p.text === m.text))?.role === 'user')
      .pop()?.text || '';

    // Формируем запрос: предыдущие сообщения + новое
    const contents = [...textHistory, { text: lastUserText }];

    const result = await model.generateContent(contents);
    const reply = result.response.text();

    res.json({ reply });
  } catch (e) {
    console.error('Chat error:', e.message);
    res.json({ reply: 'Извини, не смог ответить. Попробуй ещё раз!' });
  }
});

app.listen(PORT, () => {
  console.log(`Food'oGram запущен на порту ${PORT}`);
});
