require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    const prompt = `Ты — профессиональный диетолог и шеф-повар.
Фото еды. Очень точно определи:
1) Что это за блюдо/продукты
2) Примерный вес каждой порции в граммах
3) Калории + БЖУ (белки, жиры, углеводы)
4) 3 быстрых рецепта, что ещё можно приготовить из этих ингредиентов

Ответ строго JSON:
{
  "dish": "название",
  "ingredients": [{"name": "курица", "amount": "150г"}],
  "calories": 450,
  "protein": 32,
  "fat": 18,
  "carbs": 42,
  "recipes": ["Рецепт 1...", "Рецепт 2...", "Рецепт 3..."]
}`;

    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: imageBase64.includes('png') ? 'image/png' : 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = (await result.response.text()).replace(/```json|```/g, '').trim();

    res.json({ success: true, data: JSON.parse(text) });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Бот запущен!'));
