# About Sanket ISL Translator

Sanket ISL Translator is a real-time Indian Sign Language (ISL) to English translation system using computer vision and deep learning.

## Who is it for?

The project provides source code and an interactive prototype for developers, students and researchers investigating sign recognition. People trying it should review the restricted vocabulary and output carefully; it is not a validated interpreter service.

## What problem does it address?

The implementation explores connecting visual ISL gestures to English output. It separates recognition of a selected sign from generation of an English sentence, making the label sequence available for inspection.

## What is technically interesting?

MediaPipe estimates body and hand landmarks. A TensorFlow.js LSTM classifies temporal trajectories directly in the browser, while local Express and Ollama handle English sentence generation. This separates a relatively compact sequence classifier from the language-generation stage. See the [architecture](architecture.md) and [technical article](article.md).

## What are its limits?

The model has a fixed output vocabulary, capture must be stopped manually, and generated text can change meaning. External MediaPipe asset downloads prevent a verified offline claim. Evaluation and licensing gaps are documented in [limitations](limitations.md).

## Who maintains it, and where can I try it?

The source repository is [ujjwal-tiwari3039/Sanket-ISL-translator](https://github.com/ujjwal-tiwari3039/Sanket-ISL-translator). GitHub records contributions; repository ownership is not a scholarly authorship claim. No public deployment is established. Follow the [local installation guide](installation.md) and use [repository issues](https://github.com/ujjwal-tiwari3039/Sanket-ISL-translator/issues) for technical discussion.

## Interface screenshot

![Sanket ISL Translator interface with camera disabled](../apps/frontend/public/screenshots/translator.png)

Actual local interface capture, 2026-09-20, with camera access denied. No recognition result is shown.
