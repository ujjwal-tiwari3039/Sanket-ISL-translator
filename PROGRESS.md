# Progress Log

## Phase 1 — Mine the reference repos (Complete)
- Created branch `rebuild/isl-v2`.
- Cloned all 6 reference repositories into `/reference/` and added to `.gitignore`.
- Examined the codebases and documented their techniques and findings in `/reference/NOTES.md`.
- Key takeaways: 
  - Verified class imbalance challenges (from `sumedhsp`) which we will handle in Phase 4 via weighted loss/sampling.
  - Confirmed the necessity of multiple signers for self-recorded data (from `GesturalAI-Nerds`).
  - Validated our normalization approach against `InterpretableTransformer` and `CodingSamrat`.
  - Gathered ideas for the UI confidence indicator (from `signVLM`).

## Phase 2 — Fix the four documented blockers (Complete)
- **2a (Class/label mismatch)**: Updated `phase2_train_lstm.py` to save `models/labels.json`. Updated `phase3_realtime_inference.py` and `frontend/src/App.jsx` to load from this dynamic file instead of hardcoding actions.
- **2b (Python/TensorFlow split)**: Standardized on TensorFlow.js through `/frontend`. Verified `train_in_docker.sh` already handles the `tensorflowjs_converter` step, and updated it to copy `labels.json` to the frontend's public folder. Modified `App.jsx` to read the labels and perform inference entirely in-browser.
- **2c (Missing MP_Data/)**: Marked to be regenerated in Phase 3 during the unified pipeline.
- **2d (Gemini key)**: Added `.env.example` in the root folder, and set up a small `backend/server.js` using Express and `@google/genai` to hold the Gemini API key. Updated `frontend/src/App.jsx` to fetch streamed AI responses from this backend endpoint instead of making API calls directly.
- **2e (The scraper)**: Flagged `automated_isl_pipeline.py` for retirement pending your confirmation.

