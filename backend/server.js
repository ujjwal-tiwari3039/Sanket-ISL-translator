const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';

app.get('/', (req, res) => {
  res.send('SignAI Backend Proxy is running with local Ollama SLM.');
});

app.post('/api/assemble', async (req, res) => {
  const { sequence } = req.body;
  if (!sequence || !Array.isArray(sequence)) {
    return res.status(400).json({ error: 'Sequence array is required' });
  }

  try {
    const prompt = `Convert these isolated sign language words into a natural, grammatical English sentence: ${sequence.join(', ')}. Keep it short and direct. If it includes a word with '?', treat it as a question. Output only the final sentence without any introductory text.`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const ollamaResponse = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2:2b',
        prompt: prompt,
        stream: true
      })
    });

    if (!ollamaResponse.ok) {
        throw new Error(`Ollama responded with status: ${ollamaResponse.status}`);
    }

    if (ollamaResponse.body) {
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
      // Node 18+ fetch body is an async iterable
      for await (const chunk of ollamaResponse.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in the buffer
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              res.write(parsed.response);
            }
          } catch (e) {
             console.error("JSON parse error on line:", line);
          }
        }
      }
      
      if (buffer.trim() !== '') {
          try {
              const parsed = JSON.parse(buffer);
              if (parsed.response) res.write(parsed.response);
          } catch(e) {}
      }
    }
    
    res.end();

  } catch (error) {
    console.error('Ollama error:', error);
    if (!res.headersSent) {
       res.status(500).json({ error: `Failed to generate sentence: ${error.message}` });
    } else {
       res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT} using local Ollama.`);
});
