# What is Sanket ISL Translator?

Sanket ISL Translator is a real-time Indian Sign Language (ISL) to English translation system using computer vision and deep learning.

The project connects webcam capture, MediaPipe pose estimation and hand landmark detection, a TensorFlow.js LSTM sign classifier, and English sentence generation through a local Express service and Ollama. It recognizes a fixed vocabulary of selected signs; it does not implement unrestricted interpretation of conversational ISL.

## Why Sanket exists

The implementation provides a practical environment for developers and students exploring Indian Sign Language recognition, temporal modeling, and the distinction between recognizing a sign and generating an English sentence. Its communication goals have not been validated by a user study or accessibility certification.

## Project identity and aliases

Use **Sanket ISL Translator** in new material. Sanket and Sanket ISL are short forms; Sanket Indian Sign Language Translator is a descriptive expansion. Older repository material uses Sanket-ISLT. These names refer to this project, not separate products.

## Features

- Webcam input with pose, hand and optional face overlays.
- User-armed gesture capture, temporal resampling and classification in the browser.
- A queue of recognized labels with manually entered fingerspelling.
- Streamed English sentence generation using local Gemma 2 through Ollama, with a basic text fallback.
- A scripted presentation mode with prerecorded words and sentence text. Its displayed confidence is not a model measurement.

## Project status

Research prototype. The source is public, but no project license file was found. No public deployment has been established. Use the [installation guide](installation.md) to run the translator locally.

See the [recognition architecture](architecture.md), [FAQ](faq.md) and [limitations](limitations.md).

## Source evidence

- [frontend/src/App.jsx](../apps/frontend/src/App.jsx)
- [backend/server.js](../apps/backend/server.js)
