const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';

app.get('/', (req, res) => {
  res.send('Sanket ISL Translator Backend Proxy is running with local Ollama SLM.');
});

function mergeFingerspelledLetters(seq) {
  const result = [];
  let buffer = [];
  for (let i = 0; i < seq.length; i++) {
    const item = String(seq[i]).trim();
    if (item.length === 1 && /^[a-zA-Z]$/.test(item)) {
      buffer.push(item);
    } else {
      if (buffer.length > 1) {
        result.push(buffer.join(''));
      } else if (buffer.length === 1) {
        result.push(buffer[0]);
      }
      buffer = [];
      result.push(item);
    }
  }
  if (buffer.length > 1) {
    result.push(buffer.join(''));
  } else if (buffer.length === 1) {
    result.push(buffer[0]);
  }
  return result;
}

app.post('/api/assemble', async (req, res) => {
  const { sequence } = req.body;
  if (!sequence || !Array.isArray(sequence)) {
    return res.status(400).json({ error: 'Sequence array is required' });
  }

  const mergedSequence = mergeFingerspelledLetters(sequence);

  try {
    const prompt = `Convert these sign language words into a natural English sentence: ${mergedSequence.join(', ')}. If no question word or ? is present, end with a period. Output only the sentence without any introductory text.`;
    
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
    console.error('Ollama error, using resilient fallback:', error.message);
    const words = mergedSequence.map(w => String(w).replace(/\?/g, '').trim()).filter(Boolean);
    if (words.length > 0) {
      let fallbackSentence = words.join(' ').toLowerCase();
      fallbackSentence = fallbackSentence.charAt(0).toUpperCase() + fallbackSentence.slice(1);
      fallbackSentence = fallbackSentence.replace(/\bi\b/g, 'I');
      const isQuestion = sequence.some(w => String(w).includes('?')) || ['is', 'are', 'am', 'can', 'how', 'what', 'who', 'where'].includes(words[0].toLowerCase());
      fallbackSentence += isQuestion ? '?' : '.';
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(fallbackSentence);
      } else {
        res.write(fallbackSentence);
        res.end();
      }
    } else {
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to generate sentence: ${error.message}` });
      } else {
        res.end();
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT} using local Ollama.`);
});
