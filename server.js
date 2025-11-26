require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-preview-09-2025",
  systemInstruction: "Ты — дружелюбный и умный помощник по питанию Food'oGram. Отвечай кратко, точно и по-русски."
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Анализ фото — как было
app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Нет фото' });

    const prompt = `Ты — эксперт по питанию. Ответь ТОЛЬКО в JSON:

{
  "dish": "название",
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
    res.status(500).json({ success: false, error: 'Не смог распознать еду' });
  }
});

// Чат — теперь без фото в истории (чтобы не падало)
app.post('/chat', async (req, res) => {
  try {
    const { history } = req.body;

    // Убираем фото из истории — оставляем только текст
    const cleanHistory = history.map(msg => ({
      role: msg.role,
      parts: msg.parts.filter(p => p.text).map(p => ({ text: p.text }))
    })).filter(msg => msg.parts.length > 0);

    const chat = model.startChat({ history: cleanHistory });
    const lastUserMessage = history.filter(m => m.role === 'user').pop();
    const userText = lastUserMessage?.parts.find(p => p.text)?.text || '';

    const result = await chat.sendMessage(userText);
    const reply = result.response.text();

    res.json({ reply });
  } catch (e) {
    console.error('Chat error:', e.message);
    res.json({ reply: 'Извини, что-то пошло не так. Попробуй ещё раз!' });
  }
});

app.listen(PORT, () => {
  console.log(`Food'oGram запущен на порту ${PORT}`);
});
