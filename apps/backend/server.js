const express = require('express');
const cors = require('cors');
const {validateSequence, mergeFingerspelledLetters, fallbackSentence} = require('./language');

function createApp({fetchImpl = globalThis.fetch, timeoutMs = 20000} = {}) {
  const app = express();
  app.use(cors({origin(origin, callback) {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    callback(null, false);
  }}));
  app.use(express.json({limit: '16kb'}));
  app.get('/', (_req, res) => res.send('Sanket local sentence service'));
  app.post('/api/assemble', async (req, res) => {
    let words;
    try { words = mergeFingerspelledLetters(validateSequence(req.body?.sequence)); }
    catch (error) { return res.status(400).json({error: error.message}); }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let emitted = false;
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    try {
      const response = await fetchImpl('http://127.0.0.1:11434/api/generate', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, signal: controller.signal,
        body: JSON.stringify({model: 'gemma2:2b', stream: true, options: {temperature: 0},
          prompt: `Convert the following ISL gloss data into one natural English sentence. Preserve names and meaning. Do not add facts. Output only the sentence. Gloss data: ${JSON.stringify(words)}`}),
      });
      if (!response.ok || !response.body) throw new Error('Ollama unavailable');
      const decoder = new TextDecoder(); let pending = '';
      const emit = line => {
        if (!line.trim()) return;
        const message = JSON.parse(line);
        if (message.error) throw new Error('Ollama generation failed');
        if (typeof message.response === 'string' && message.response) {
          if (!res.destroyed) { res.write(message.response); emitted = true; }
        }
      };
      for await (const chunk of response.body) {
        pending += decoder.decode(chunk, {stream: true});
        const lines = pending.split('\n'); pending = lines.pop();
        for (const line of lines) emit(line);
      }
      pending += decoder.decode(); emit(pending);
      if (!emitted) throw new Error('Empty generation');
      res.end();
    } catch (_error) {
      if (!res.destroyed) {
        if (emitted) {
          // Signal incomplete generation; never append an unrelated fallback to a prefix.
          res.destroy(new Error('Sentence stream interrupted'));
        } else {
          res.setHeader('X-Sanket-Assembly', 'fallback');
          res.end(fallbackSentence(words));
        }
      }
    } finally {
      clearTimeout(timer);
      controller.abort();
      res.off('close', disconnect);
    }
  });
  app.use((error, _req, res, _next) => res.status(error.status || 400).json({error:'Invalid request body'}));
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, '127.0.0.1', () => console.log(`Sanket backend on http://127.0.0.1:${port}`));
}
module.exports = {createApp};
