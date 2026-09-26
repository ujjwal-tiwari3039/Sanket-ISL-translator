# Local sentence service

Run `npm ci` and `npm start` here. The service binds `127.0.0.1:3001` (override port with `PORT`) and requests local Ollama `gemma2:2b`. It never uploads frames.

`POST /api/assemble` accepts `{ "sequence": ["my", "name", {"type":"fingerspell","kind":"name","letters":["U","J","J","W","A","L"]}] }` and streams English text. Glosses must belong to the shipped vocabulary or supported function words/letters. Explicit `kind:"acronym"` preserves capitals. Input length/type/characters are validated; ordinary I/A words are not merged into names.

Requests have a 20-second upstream timeout and cancellation on disconnect. Failure before output starts produces deterministic text formatting. Midstream failure aborts instead of attaching fallback to a partial sentence. Fallback is not a trained grammar model. `GET /` is a process check, not proof Ollama is available.

`npm test` runs validation, fingerspelling, fallback, streaming and timeout regressions. See [root instructions](../../README.md).
