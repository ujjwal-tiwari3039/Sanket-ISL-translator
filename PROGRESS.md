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
- **2e (The scraper)**: Flagged `automated_isl_pipeline.py` for retirement pending your confirmation. Deleted it after confirmation.

## Phase 3 — Bring in ISL-CSLTR & INCLUDE (Complete)
- Checked `islmodel/ISL_CSLRT_Corpus`. Verified that the corpus only provides sentence-level annotations with full video sequences, while the word-level data contains only isolated static frames, not time sequences.
- Per the integration strategy, the sentence-level dataset should be set aside for a future sequence-to-sequence model.
- Discovered the `INCLUDE` dataset (`islmodel/ProcessedData_vivit`) thanks to your pointer! It has 76 word classes with hundreds of isolated `.MOV` videos.
- Wrote `phase3_process_include.py` to extract 30 evenly spaced frames per video from the INCLUDE dataset using our nose-relative MediaPipe normalization.
- **Status**: Complete! All 1,166 videos successfully processed and converted to `.npy` keypoint sequences inside `MP_Data/`.

## Phase 4 — Retrain properly (Complete)
- **Track A (Simple System)**: Updated `phase2_train_lstm.py` to:
  - Dynamically load all available action classes from the `MP_Data/` folders (safely ignoring empty folders).
  - Apply dataset augmentations (small coordinate jitter across non-zero landmarks) to double the size of the dataset and support thin classes.
  - Implement `Weighted Random Sampling / class_weights` via `sklearn` to handle the imbalanced nature of the dataset.
  - Generate a `classification_report.txt` and `confusion_matrix.png` into `/models/eval/` for your README.
- **Status**: Successfully trained via Docker on the 76 INCLUDE classes. Model exported to TFJS!

## Phase 5 — Real-time inference tweaks (Complete)
- Converted inference to use a stable buffer: 10 consecutive model predictions must agree before triggering a UI state change, eliminating bouncing text.
- Implemented the Non-Manual Feature (NMF) heuristic: the system tracks the distance between MediaPipe face mesh eyebrows (Indices 105/334 vs 159/386). If raised, it appends a '?' to the predicted sign before feeding it into the LLM context array.
- Added explicit UI lifecycle states (`IDLE`, `DETECTING`, `ASSEMBLING`, `ERROR`) to handle async Gemini streaming feedback seamlessly.

## Phase 6 — Frontend Rebuild (Complete)
- Stripped out all generic "AI glassmorphism" from the Vite frontend app.
- Transitioned the UI to a rigid, high-contrast, brutalist data-dashboard layout emphasizing constraint and legibility (Inter & JetBrains Mono fonts, simple grids).
- Integrated the UI state indicators and live LLM caption panels cleanly.

## Phase 7 — Wire it up and hand it back (Complete)
- Rewrote the `README.md` into an engineering case study highlighting the sequence modeling, nose-relative normalization, NMF heuristics, and asynchronous LLM stitching.
- Ensured the UI displays a clear confidence score and explicit visual flags for the NMF heuristic (e.g., `NMF: Eyebrow Raise (?)`).
- The full end-to-end Vite & Express pipeline is now fully integrated and documented. 

**Project Rebuild Successfully Concluded!**
