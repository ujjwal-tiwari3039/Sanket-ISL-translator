# Sanket ISL Translator — Backend

Local Express server providing English sentence generation via Ollama.

## Overview

This is a minimal Express 4 server (`server.js`). It acts as a local proxy between the browser frontend and a locally running Ollama instance.

## API

### `POST /api/assemble`

Accepts a JSON body `{ "sequence": ["word1", "word2", ...] }` and streams an English sentence using the local Ollama `gemma2:2b` model.

Handles:
- Single-letter fingerspelling merging
- Ollama streaming (chunked transfer)
- Graceful fallback formatting when Ollama is unavailable

### `GET /`

Health check returning a plain text status message.

## Running

```bash
npm install
npm start
# Server listens on PORT (default 3001)
```

Requires Ollama running locally with `gemma2:2b` pulled:
```bash
ollama serve
ollama pull gemma2:2b
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3001`  | Server port |

See `.env.example` at the repository root.
