# Glossary of ISL recognition and browser AI

## Indian Sign Language (ISL)

A sign language used by Deaf communities in India, with its own linguistic structure. ISL is not English expressed word for word as gestures. Sanket targets selected ISL signs.

## Sign language recognition

Estimating a sign label from visual input. Sanket uses temporal landmark classification for this stage.

## Sign language translation

Converting signed language meaning into another language. Sanket approximates a restricted pipeline by recognizing labels and generating English text; unrestricted translation is not established.

## Gesture recognition

Identifying movements or poses. It is broader than sign language recognition and does not necessarily model linguistic meaning.

## Hand landmarks and pose landmarks

Estimated coordinates for hand joints and body points. MediaPipe also supplies pose visibility values. They are model estimates, not direct physical measurements.

## MediaPipe

A toolkit providing the pose, hand and face landmark tasks used here for computer vision.

## LSTM and sequence classification

Long short-term memory networks process ordered sequences using recurrent state. Sequence classification maps a sequence to a class; Sanket classifies 30-frame feature sequences.

## Gloss

A written label used to refer to a sign. Sanket's English class labels serve as practical gloss-like identifiers, not a complete linguistic annotation system.

## Sentence generation

Producing readable text from a sequence of recognized labels. Sanket uses Gemma 2 through Ollama, with a basic fallback formatter.

## Computer vision

Computational analysis of images or video. Sanket uses it to estimate landmarks before sign classification.

## Edge AI and browser-based AI

Running model computation near the input device, including inside a browser. Local computation does not imply that model downloads or other requests are offline.

## WebAssembly and WebGL

WebAssembly is a portable execution format used by browser vision runtimes. WebGL is a browser graphics API that can accelerate tensor operations. Available TensorFlow.js backends depend on the browser; no performance guarantee follows from the API name.

## TensorFlow.js

A JavaScript machine-learning library. Sanket loads its exported Layers model for browser inference.

## Softmax confidence

The model's probability-like score over its known classes. It is not measured accuracy, a guarantee of correctness or proof that an input belongs to a known class.

See [overview](overview.md), [model](model.md) and [FAQ](faq.md).
