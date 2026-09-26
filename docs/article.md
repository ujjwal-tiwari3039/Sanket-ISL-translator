# How Sanket ISL Translator connects computer vision to English text

Current pipeline details: [canonical schema](landmark-schema.md), [training](training.md), [evaluation](evaluation.md). The Phase 0 findings describe the pre-fix baseline; historical training claims do not describe new candidates.


## The problem

Indian Sign Language recognition and English sentence generation are different tasks. A classifier can assign a label to a video sequence without understanding a conversation. Sanket ISL Translator makes both stages visible: gesture capture and predicted labels appear alongside generated English text.

## From images to landmark trajectories

The live React application loads MediaPipe pose, hand and face tasks. Instead of feeding camera pixels into its LSTM, it extracts pose and hand coordinates. The training and inference code subtract nose x/y and divide by shoulder width. This reduces some framing variation, although depth coordinates are not scaled and full camera invariance is not established.

## From variable duration to fixed input

A captured gesture may span different numbers of frames. The browser interpolates it into 30 frames, each containing 258 features. Three LSTM layers with 64, 128 and 64 units feed a Dense head over 263 labels. Capture boundaries matter: truncating the start or end of a movement changes the input trajectory. The loop starts after arming and sufficient hand motion; bounded capture supports manual stopping or low-motion hysteresis with pre/post padding.

## From labels to sentences

Selected labels accumulate in a context queue. An Express endpoint forwards them to local Ollama running Gemma 2. The model is asked to generate a natural English sentence. This can improve readability but cannot recover information absent from the recognized labels. A fluent sentence can still be incorrect.

## What the prototype teaches

The saved evaluation report looks promising, but the historical trainer augmented before splitting and reused validation for reporting. A fair new evaluation should split original recordings before augmentation and measure unfamiliar signers. Likewise, the presentation demo uses scripted words and cannot demonstrate recognition quality.

## Browser inference and connectivity

Running the classifier in TensorFlow.js keeps this computation in the browser. It does not automatically make a website offline: MediaPipe task assets, WASM and fonts are fetched externally, while sentence generation depends on local services.

## Next steps and source

The next research work is to establish data lineage, correct evaluation splits and test feature parity and sentence fidelity. Read the [source repository](https://github.com/ujjwal-tiwari3039/Sanket-ISL-translator), [model](model.md), [dataset](dataset.md) and [limitations](limitations.md). This article is project-authored documentation, not an independent review or third-party endorsement.

## Source evidence

- [frontend/src/App.jsx](../apps/frontend/src/App.jsx)
- [apps/backend/server.js](../apps/backend/server.js)
- [ml/src/training/train_lstm.py](../ml/src/training/train_lstm.py)
