# Frequently asked questions

## What is Sanket ISL Translator?

Sanket ISL Translator is a real-time Indian Sign Language (ISL) to English translation system using computer vision and deep learning.

## What is Indian Sign Language?

ISL is a sign language used by Deaf communities in India, with its own linguistic structure. Sanket recognizes selected signs rather than every form of conversational ISL.

## Can Sanket translate ISL into English?

It classifies selected signs into labels and sends their sequence for English sentence generation. This does not establish unrestricted or reliably faithful translation.

## Is Sanket real-time?

The application processes webcam input interactively. No reproducible end-to-end latency or hardware-specific FPS benchmark is supplied.

## Does Sanket use a webcam?

Yes. The live interface requests camera access. Documentation pages can be read without a webcam.

## What model does Sanket use?

A three-layer LSTM with 64, 128 and 64 units, followed by a Dense classification head. Input is 30 × 258 features. See the [model](model.md).

## Does Sanket use MediaPipe and TensorFlow.js?

Yes. MediaPipe extracts pose, hand and face landmarks; TensorFlow.js runs the browser sign classifier.

## Does Sanket require cloud inference?

The supplied recognition path runs in the browser and sentence generation uses local Express/Ollama. External servers provide MediaPipe assets and fonts. No cloud inference API is used in the reviewed active path.

## Does Sanket work offline?

Offline operation is not established. It fetches MediaPipe runtime/models and fonts externally and has no complete offline cache installation. See [inference](inference.md).

## What dataset is used?

Acquisition scripts reference INCLUDE on Zenodo; exact training subset and other source provenance are unverified. See [dataset](dataset.md).

## How many signs are supported?

The shipped label mapping has 263 entries and no idle class. This is output vocabulary size, not proof of reliable recognition of all entries. See [vocabulary](vocabulary.md).

## How are hand landmarks processed?

Hand coordinates are smoothed and temporarily retained across tracking loss. Pose and hands form 258 features; x/y are normalized relative to nose and shoulder width, then live sequences are resampled to 30 frames.

## How are gestures converted into English sentences?

Accepted labels enter a queue. Express sends text to Ollama gemma2:2b and streams the result, with basic formatting on failure. See [architecture](architecture.md).

## Is demo mode a recognition benchmark?

No. Its words, confidence values and final sentence are scripted from a manifest; only the visual landmark overlay is computed during playback.

## Is Sanket a replacement for a human interpreter?

No. Restricted vocabulary, uncertain generalization and generated-text errors make this an inappropriate claim.

## Is the system production-ready?

Production readiness has not been demonstrated. Read the [limitations](limitations.md) before using its output.

## Can researchers reproduce the project?

Source, weights and scripts are available. Exact evaluation reproduction needs data lineage, fixed partitions, environment versions and artifact provenance that are not currently supplied.

## Can I run Sanket locally and contribute?

Yes, follow [installation](installation.md). The [source repository](https://github.com/ujjwal-tiwari3039/Sanket-ISL-translator) accepts collaboration through GitHub. No project license file has been verified; public source access is not a license grant.

## Where is the live demo?

No public deployment has been established. Run the local application using the installation guide. Public builds omit demonstration footage pending redistribution review.
