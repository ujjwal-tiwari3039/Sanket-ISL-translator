# How Indian Sign Language becomes English output

Sanket ISL Translator uses a recognition stage followed by a sentence-generation stage. A recognized class is an English label for a selected ISL sign, not a full linguistic representation of an utterance.

## Capture a sign

Open the local application and grant camera access. The live interface starts camera capture and loads the models. Arm gesture capture using its button or Space. Motion starts recording; use the control or Space again to stop and classify. The active detector records until explicitly stopped. A stroke-mode toggle remains in the UI, but the active recognition loop does not implement a separate rolling classifier.

## Extract landmarks

MediaPipe estimates pose, hands and face. Hand trajectories are smoothed, and temporary tracking losses retain hand coordinates briefly. The classifier receives pose and hand features only, normalized relative to the nose and shoulder width.

## Classify a temporal sequence

The live capture is resampled to 30 frames. The LSTM predicts probabilities over the 263 labels shipped in the model mapping. The armed path displays the top candidates and accepts the top result above its 0.40 threshold. This threshold is a software setting, not accuracy or calibrated certainty.

## Generate English

Accepted labels accumulate in Sequence Context. Finish & Translate sends this text to the Express endpoint. Consecutive manually entered letters are merged; Ollama receives a prompt to turn the words into a natural English sentence. A network/model failure invokes basic capitalization and punctuation fallback. Generated grammar can change intended meaning.

## Understand presentation mode

Presentation playback overlays MediaPipe landmarks, but uses manifest words, confidence values and sentence text on a timeline. It does not evaluate the LSTM and must not be used as recognition evidence.

Read the [model specification](model.md), [inference details](inference.md) and [limitations](limitations.md).

## Source evidence

- [frontend/src/App.jsx](../apps/frontend/src/App.jsx)
- [frontend/src/DemoMode.jsx](../apps/frontend/src/DemoMode.jsx)
