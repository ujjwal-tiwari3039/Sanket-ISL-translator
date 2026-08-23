const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

app.get('/', (req, res) => {
  res.send('SignAI Backend Proxy is running and listening for POST requests on /api/assemble.');
});

app.post('/api/assemble', async (req, res) => {
  const { sequence } = req.body;
  if (!sequence || !Array.isArray(sequence)) {
    return res.status(400).json({ error: 'Sequence array is required' });
  }

  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the backend.' });
  }

  try {
    const prompt = `Convert these isolated sign language words into a natural, grammatical English sentence: ${sequence.join(', ')}. Keep it short and direct. If it includes a word with '?', treat it as a question. Output only the final sentence.`;
    
    // We can use streaming if needed, but for Express basic fetch, we can return the text.
    // If we want to support streaming, we could use res.write...
    // The prompt requests streaming in phase 5, but for Phase 2, a simple endpoint is fine. Wait, Phase 5: "Use Gemini's streaming response mode so the sentence appears progressively..." Let's do streaming!
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      res.write(chunk.text);
    }
    res.end();

  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: `Failed to generate sentence: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
