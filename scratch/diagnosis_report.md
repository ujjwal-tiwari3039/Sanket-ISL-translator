# Phase A Diagnosis & Phase B Action Plan

I have diagnosed the pipeline issues based on the Phase A protocol. The root cause is absolutely a combination of **A9 (Feature Vector Imbalance)**, **A7 (Missing Scale Normalization)**, and **A8 (Frame Timing Mismatch)**. 

### Phase A Diagnosis Results

*   **A1 (Model Freshness):** **PASS.** Checked timestamps; `model.json` and `action.h5` were generated properly today.
*   **A2 (Label Alignment):** **PASS.** `labels.json` correctly contains 76 classes that sequentially align with the training script.
*   **A3 (Validation Accuracy):** **FAIL.** Checking the generated `classification_report.txt` shows the model's validation accuracy is **38%**. This indicates a severe issue with how the LSTM is learning the data, meaning it's not just a frontend bug.
*   **A5 (Raw Word vs Gemini):** **FAIL.** As expected, the frontend raw predictions are already wrong, ruling out Gemini entirely.
*   **A7 (Feature Pipeline Parity - Scale):** **FAIL.** Both the Python training script and the JS frontend correctly translate coordinates relative to the nose. However, **neither side applies scale normalization**. INCLUDE was recorded at a fixed studio distance; when a live user stands at a different distance from their webcam, the coordinates are vastly larger/smaller than anything the model has ever seen.
*   **A8 (Frame Timing):** **FAIL.** The `phase3_process_include.py` script uniformly extracts exactly 30 frames from 2–3 second `.MOV` clips (an effective framerate of ~10-15 FPS). Meanwhile, `App.jsx` captures frames via `requestAnimationFrame` at 60 FPS, meaning the live 30-frame buffer spans only 0.5 seconds. The live sign is being seen in "fast forward" compared to the training data.
*   **A9 (Feature Vector Composition):** **FAIL.** Of the 1,692 features, **1,434 (85%) belong to the face mesh**. Only 126 (7%) belong to the hands. The LSTM is completely overwhelmed by microscopic facial noise and is largely ignoring the hands—which perfectly explains the abysmal 38% validation accuracy.

---

### Phase B Fixes (To Apply)

I will edit the following files to harden the system against these findings *without* requiring you to re-extract the whole dataset:

1.  **`phase2_train_lstm.py` (B4 - Trim Face & B5 - Scale Normalization):**
    *   I will modify the data loader to dynamically slice the `.npy` arrays, dropping the 1,434 face features entirely before they enter the LSTM, bringing the input shape down from `1692` to `258`. (NMF eyebrow detection lives strictly in the frontend, so the LSTM doesn't need the face).
    *   I will add scale normalization, dividing all coordinates by the shoulder width (distance between Pose landmarks 11 and 12).
2.  **`frontend/src/App.jsx` (B4, B5, B8, B9):**
    *   **B4 & B5:** Apply the exact same face-trimming slice (`[...pose, ...hands]`) and shoulder-width scale normalization before pushing to the buffer.
    *   **B8 (Frame Timing):** Throttle the `detectForVideo` extraction loop from 60 FPS down to ~15 FPS so the 30-frame buffer correctly spans 2 seconds to match the training data.
    *   **B9 (Rolling Vote):** Update the UI logic to use a rolling majority vote over the last 5 predictions instead of requiring 10 consecutive identical frames, making it more resilient to one-off dropped frames.

I am executing these code changes now.
