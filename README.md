# AI Sign Language Translator (Dynamic Sequence Model)

## 📌 Case Study & Overview

This project goes beyond traditional static alphabet (A-Z) classification by implementing **Dynamic Sign Language Recognition**. Recognizing that real sign language relies on sequential motion and non-manual features (like facial expressions), this system uses a Long Short-Term Memory (LSTM) network over a sequence of spatial landmarks extracted via MediaPipe. 

Furthermore, this system integrates **Large Language Models (LLMs)** to handle the linguistic complexity of stitching isolated signs into grammatically correct sentences, mirroring the actual grammatical structure of sign languages which often do not map 1:1 to English.

### 🎯 Niche: Emergency & Medical Phrases
Instead of trying to capture a saturated general dictionary, this project specifically targets high-leverage **Emergency and Medical Phrases** (e.g., "Help", "Pain", "Medicine", "Doctor", "Thank You"). This focus ensures high accuracy in scenarios where communication barriers have the most critical impact.

---

## 🚀 Key Differentiators

1. **Sequential Data (LSTM over CNNs)** 
   - Most beginner projects use a single-frame CNN to classify static hand shapes. This project feeds 30-frame sequences of 1,692 keypoints into an LSTM, allowing it to understand the temporal dynamics of signs.
2. **LLM Sentence Assembly**
   - Sign languages lack words like "is", "the", and "are". Predicting `[Pain] [Stomach] [Help]` is passed to the Gemini API, which outputs: *"I have stomach pain and need help."* This auto-corrects and smooths the output into natural language.
3. **Non-Manual Features (NMFs)**
   - The model actively tracks all 478 facial landmarks. We implemented heuristics to detect raised eyebrows, a standard NMF used to indicate a question. For example, `[Help]` + `[Raised Eyebrows]` = *"Do you need help?"*

---

## 🧠 Architecture & Pipeline

### 1. Keypoint Extraction Pipeline (`phase1`)
We use Google's MediaPipe Tasks API to extract comprehensive keypoints per frame:
- **Pose:** 33 points (x, y, z, visibility)
- **Face:** 478 points (x, y, z)
- **Hands:** 21 points per hand (x, y, z)
Totaling **1,692 features** per frame.

### 2. Deep Learning Model (`phase2`)
A standard dense network struggles with temporal data. We utilized a multi-layer LSTM:
- **Input:** `(30 frames, 1692 keypoints)`
- **Hidden Layers:** LSTM(64) -> LSTM(128) -> LSTM(64) -> Dense(64)
- **Output:** Softmax activation across the vocabulary size.

### 3. Inference & Contextualization (`phase3`)
- A rolling window of the last 30 frames is continuously fed into the LSTM.
- A confidence threshold filters out noise.
- Every N predictions are sent to an LLM (Gemini) in a background thread to generate the final semantic sentence without blocking the webcam feed.

---

## 📊 Dataset & Limitations

**Data Collection:**
Data was self-collected (30 sequences of 30 frames per sign) to bootstrap the prototype. We also built an automated web scraper (`phase1_6`) to aggregate high-quality ISL (Indian Sign Language) dictionary videos for transfer learning.

**Current Limitations (Acknowledged for Future Work):**
- **Isolated Gestures:** The model currently struggles with continuous, fluid signing (co-articulation). The LLM helps mitigate this, but a sliding-window temporal segmentation approach is needed.
- **Lighting & Viewpoint Variance:** The model was trained in static lighting from a frontal webcam angle. Accuracy drops significantly in profile views.

---

## 💻 Getting Started

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install tensorflow mediapipe google-generativeai undetected-chromedriver
   ```
2. **Train the Model:**
   ```bash
   python phase2_train_lstm.py
   ```
3. **Run Real-Time Inference:**
   ```bash
   # Add your Gemini API key in the script first
   python phase3_realtime_inference.py
   ```

*(Upcoming: TensorFlow.js Web Demo deployment for in-browser testing)*
