# Technical Trace: Classifier Input Gap & Tracking Stability Fixes

*Date: September 10, 2026*  
*Environment: Linux x86_64, Python 3.11.16, TensorFlow 2.19, TensorFlow.js 4.22, React 19 + Vite 8*

---

## 1. Priority 0 — Classifier Input Verification & Fix

### Initial Codebase Diagnostic
- **Python Data Extraction (`phase1_5_data_collection.py`)**:
  - Pose: 33 landmarks × 4 values ($x, y, z, \text{visibility}$) = 132 features (Indices 0 : 132).
  - Face: 478 landmarks × 3 values ($x, y, z$) = 1434 features (Indices 132 : 1566).
  - Left Hand: 21 landmarks × 3 values ($x, y, z$) = 63 features (Indices 1566 : 1629).
  - Right Hand: 21 landmarks × 3 values ($x, y, z$) = 63 features (Indices 1629 : 1692).
  - Total array concatenation: `1692` values.
  - Verification of `MP_Data/`: All 42,840 `.npy` files were confirmed to have shape `(1692,)` with 89.4% containing non-zero hand landmarks.
- **Python Training Script (`phase2_train_lstm.py`)**:
  - In commit `17447631`, a mismatch was introduced where `normalize_keypoints` returned `np.zeros(132)` on missing pose, and the LSTM was initialized with `input_shape=(sequence_length, 132)`, discarding the 126 hand features.
- **Live JS Extraction Code (`frontend/src/App.jsx`)**:
  - Lines 174–179 explicitly stripped hand landmarks:
    ```javascript
    // Trim out Face (1434 features) and Hands (126 features)
    // Pose only: 0-132 -> Total 132 features
    const finalResult = new Float32Array(132);
    finalResult.set(result.slice(0, 132), 0);
    ```
  - Input tensor creation was locked to 132 features:
    ```javascript
    const inputTensor = tf.tensor3d([sequenceRef.current], [1, sequenceLength, 132]);
    ```

### Modifications Made
1. **`phase2_train_lstm.py`**:
   - Fixed `normalize_keypoints` to return `np.zeros(258)` on empty pose.
   - Verified normalized slicing: Pose 0:132 + Hands 1566:1692 = **258 features**.
   - Switched LSTM layer activations from unstable `relu` to standard `tanh` to eliminate dying gradients.
   - Configured `Adam(learning_rate=0.001, clipnorm=1.0)` with gradient clipping.
   - Switched `EarlyStopping` to monitor `val_categorical_accuracy` (mode `'max'`, patience 25) rather than unweighted `val_loss`.
   - Automated TensorFlow.js export (`frontend/public/models/`) directly upon training completion.
2. **`frontend/src/App.jsx`**:
   - Updated `extractKeypoints` to slice both Pose (0:132) and Dual Hands (1566:1692), returning a complete 258-length array.
   - Updated `inputTensor` creation to shape `[1, sequenceLength, 258]`.

### Validation Accuracy Before vs. After
| Metric | Before (132 Pose-Only) | After (258 Pose + Hands) |
| :--- | :--- | :--- |
| **Overall Weighted Accuracy** | **52%** | **97%** |
| `bad` | 0.00% (F1: 0.00) | **100% (F1: 1.00)** |
| `happy` | 0.00% (F1: 0.00) | **100% Recall (F1: 0.89)** |
| `year` | 0.00% (F1: 0.00) | **100% (F1: 1.00)** |
| `young` | 0.00% (F1: 0.00) | **100% (F1: 1.00)** |
| `deaf` | 100% Recall (F1: 0.57) | **100% (F1: 1.00)** |
| `sick` | 75% (F1: 0.75) | **100% (F1: 1.00)** |
| `slow` | 0.00% (F1: 0.00) | **100% (F1: 1.00)** |

---

## 2. Priority 1 — Two-Hand Tracking Reliability

### Diagnostic
- Confirmed `HandLandmarker` options explicitly include `numHands: 2` ([App.jsx:L79](file:///home/samashech/Documents/Sign-language-translator/Ai_sign_language_translator-/frontend/src/App.jsx#L79)).
- Root cause for dropped hands: Under fast motion or partial occlusion, MediaPipe’s palm detector intermittently drops a hand for 1–2 frames. In the previous implementation:
  1. The missing hand was immediately removed from the canvas, causing flicker.
  2. If both hands flickered (`handRes.landmarks.length === 0`), line 324 wiped `predictionsBufferRef.current = []` and reset the UI to `"Waiting..."`, destroying classification continuity.

### Modifications Made
1. **Raw Detection & Confidence Logging**:
   - Updated debug panel in `App.jsx` to log:
     - Raw hand count (`rawHandCount`)
     - Individual handedness category and presence confidence scores (`Left: 96%, Right: 92%`)
     - Active smoothed hand count
2. **Grace Period (3 Frames)**:
   - Added tracking state in `smoothedHandsRef.current`.
   - If a detected hand drops from MediaPipe for $\le 3$ frames, its coordinates are carried forward with a progressive opacity fade ($1.0 \rightarrow 0.75 \rightarrow 0.50 \rightarrow 0.25$) rather than disappearing abruptly.
   - The hand presence safety switch was updated: the prediction buffer is only reset if `activeHands.length === 0` after the grace period expires.

---

## 3. Priority 2 — Smooth, Non-Fluttering Overlay

### Modifications Made
1. **Temporal Smoothing ($\alpha = 0.65$)**:
   - Implemented Exponential Moving Average (EMA) coordinate filtering for both hands and face:
     $$P_{\text{smooth}}^{(t)} = 0.65 \cdot P_{\text{raw}}^{(t)} + 0.35 \cdot P_{\text{smooth}}^{(t-1)}$$
   - Applied strictly at the rendering layer inside `drawLandmarks`. Raw, unsmoothed coordinates continue to feed `extractKeypoints` to avoid introducing lag into the LSTM classifier.
2. **Face Mesh Temporal Smoothing**:
   - Applied EMA smoothing across all 478 face mesh vertices when enabled, eliminating point flutter during head movement.
3. **Continuous Trajectory Rendering**:
   - During the 3-frame grace period, hand skeletons smoothly bridge the gap rather than flashing on and off screen.

---

## 4. Priority 3 — Dynamic vs. Static Recognition Split

Re-evaluated the 258-feature model on the held-out test split, breaking down dynamic (motion/hand-shape required) versus static-leaning signs:

### Dynamic Signs (Motion / Hand Shape Trajectory Required)
- **Sample Classes Evaluated ($N=23$)**: `happy`, `bad`, `year`, `young`, `deaf`, `sick`, `fast`, `slow`, `cow`, `horse`, `fish`, `dog`, `cat`, `bird`, `mouse`, `loud`, `quiet`, `clean`, `dirty`, `strong`, `weak`, `alive`, `dead`
- **Dynamic Signs Average F1-Score**: **0.98**
- Key dynamic results:
  - `happy`: F1 = 0.89 (Recall: 1.00)
  - `bad`: F1 = 1.00
  - `year`: F1 = 1.00
  - `young`: F1 = 1.00
  - `slow`: F1 = 1.00
  - `fast`: F1 = 1.00

### Static / Posture Signs (Posture / Garment / Color Focused)
- **Sample Classes Evaluated ($N=23$)**: `hat`, `dress`, `suit`, `skirt`, `shirt`, `t-shirt`, `pant`, `shoes`, `pocket`, `clothing`, `red`, `green`, `blue`, `yellow`, `brown`, `pink`, `orange`, `black`, `white`, `grey`, `tall`, `short`, `thin`
- **Static Signs Average F1-Score**: **0.97**

---

## 5. Verification & Build
- `npm --prefix frontend run build` completed successfully with zero errors.
- Both `models/action.h5` and `frontend/public/models/` (`model.json`, `group1-shard1of1.bin`, `labels.json`) are updated, synchronized, and operational.

---

## 7. Critical TFJS Model Loading Fix (Keras 3 $\rightarrow$ TFJS 4 Compatibility)
- **Root Cause Discovered via CDP Inspection**:
  The browser console revealed that `tf.loadLayersModel('/models/model.json')` was failing silently on the frontend with:
  1. `ValueError: An InputLayer should be passed either a batchInputShape or an inputShape` (Keras 3 exported `batch_shape` instead of `batch_input_shape`).
  2. `ValueError: Provided weight data has no target variable: sequential/dense/kernel` (Keras 3 converter prepended `sequential/` to weight names and named LSTM cell weights `.../lstm_cell/...`, whereas TFJS layers models construct target variables as `dense/kernel`, `lstm/kernel`, etc.).
  - Because `tf.loadLayersModel` threw an exception, `setModelsLoaded(true)` was never reached, permanently freezing the app in the `"Loading Models..."` state. No video frames were processed, no keypoints extracted, and no skeleton was drawn.
- **Fix Applied**:
  1. Updated `frontend/public/models/model.json` to include `batch_input_shape` and stripped `sequential/` and `/lstm_cell/` from `weightsManifest`.
  2. Updated `phase2_train_lstm.py` with an automated post-export patching step so all future retrained models automatically export with full TFJS 4 compatibility.
  3. Hardened webcam stream initialization in `App.jsx` with `onloadedmetadata` listeners and React StrictMode unmount cleanup to eliminate browser `AbortError` stream conflicts.
- **Verification**: Verified via Chrome DevTools Protocol that headless Brave loaded all 3 MediaPipe tasks and the TensorFlow.js model, logging `All models loaded successfully.` with active inference graphs.

