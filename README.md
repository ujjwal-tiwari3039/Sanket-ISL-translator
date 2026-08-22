# SignAI: Real-Time Sign Language Translation Pipeline

## 📌 Case Study & Engineering Overview

This project was built to tackle the challenges of **Dynamic Sign Language Recognition**. Unlike traditional static alphabet (A-Z) classifiers that only recognize hand shapes, real sign language relies on sequential motion, speed, and non-manual features like facial expressions. 

We built an end-to-end pipeline that captures video, extracts skeletal structures, evaluates temporal dynamics via an LSTM, and semantically stitches the predictions using a Large Language Model (LLM).

### 🎯 Objective & Niche
Our goal was to create a robust, extensible pipeline for Indian Sign Language (ISL), combining the **INCLUDE dataset** (76 classes, 1000+ videos) with custom gap-filling recordings. The UI was designed specifically for legibility and real-time inference without blocking the main camera thread.

---

## 🚀 Key Engineering Decisions & Differentiators

### 1. Nose-Relative Spatial Normalization
To make the model invariant to where the signer is standing on camera, all 1,692 features (Pose, Face, and Hands) extracted by MediaPipe are **normalized relative to the nose landmark** (Index 0). This prevents the LSTM from memorizing the signer's absolute screen position and instead forces it to learn the relative motion of the joints.

### 2. Temporal Sequence Modeling (LSTM) 
A standard dense network struggles with motion over time. We utilized a multi-layer Long Short-Term Memory (LSTM) network:
- **Input Shape:** `(30 frames, 1,692 keypoints)`
- **Architecture:** `LSTM(64) -> Dropout(0.2) -> LSTM(128) -> Dropout(0.2) -> LSTM(64) -> Dense(64) -> Output(76)`
- **Training Strategy:** Implemented `compute_class_weight` to counter the class imbalance of the INCLUDE dataset, alongside coordinate jitter data augmentation.

### 3. Non-Manual Features (NMFs) Heuristic
Sign languages rely heavily on the face. Our frontend actively tracks the MediaPipe face mesh (478 points). We implemented a geometric heuristic to measure the vertical distance between the eyebrows and the eyes. **When a significant spike is detected, the system appends a `?` to the prediction**, signaling a question to the LLM.

### 4. Asynchronous LLM Semantic Assembly
Translating a sequence of signs into English isn't a 1:1 mapping (e.g. `[What] [Time] [Now?]` -> *"What time is it right now?"*).
We pass the raw detected signs to Gemini via a chunked streaming local backend (`Express.js`). We use a 10-prediction agreement buffer to prevent the UI from flickering, triggering the async LLM fetch only when the prediction stabilizes.

---

## 🧠 Architecture Stack

* **Feature Extraction:** `MediaPipe Tasks Vision` (WebAssembly/TFJS in frontend, Python during dataset building)
* **Model Training:** `TensorFlow 2.15` (Python / Docker)
* **Web Inference:** `TensorFlow.js` (Running the exported Keras model directly in the browser)
* **Frontend UI:** `React / Vite` (Brutalist, high-contrast dashboard)
* **Backend Proxy:** `Express / @google/genai` (For secure LLM API calls and streaming responses)

---

## 📊 Dataset & Evaluation

**Data Sources:**
- **INCLUDE Dataset (`islmodel/ProcessedData_vivit`)**: 1,166 isolated videos spanning 76 word classes.
- **Custom Recordings**: A Python gap-filling tool allows users to record their own missing words and directly save them as `.npy` sequences.

**Evaluation:**
Check `/models/eval/` for the generated `classification_report.txt` and `confusion_matrix.png`. The confusion matrix highlights which morphologically similar signs the model occasionally mixes up.

---

## 💻 Getting Started

### 1. Setup Backend (LLM Proxy)
```bash
cd backend
npm install
cp .env.example .env
# Add your GEMINI_API_KEY to .env
npm start
```
*Runs on http://localhost:3001*

### 2. Setup Frontend (Web App)
```bash
cd frontend
npm install
npm run dev
```
*Runs on http://localhost:5173*

*(Note: If you wish to retrain the model on new signs, run `bash train_in_docker.sh` from the root directory to utilize the Python pipeline and auto-export the new `action.h5` to the `frontend/public/models` directory.)*
