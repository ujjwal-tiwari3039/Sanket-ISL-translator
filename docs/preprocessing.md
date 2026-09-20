# Landmark preprocessing

Sanket ISL Translator represents video as sequences of landmarks rather than raw image tensors for its LSTM.

## Feature layout

The Python extractor concatenates 33 pose points with x/y/z/visibility (132 values), 478 face points with x/y/z (1,434 values), and two sets of 21 hand points with x/y/z (126 values): 1,692 values before trimming. Missing detections are zero-filled.

The trainer removes face coordinates, leaving 132 pose plus 63 left-hand plus 63 right-hand values: **258 features per frame**. Pose z and visibility and hand z are retained. Only x/y receive nose translation and shoulder-width normalization. It would be inaccurate to call this full 3D scale invariance.

## Spatial transformation

For nonzero x/y pairs, subtract nose x/y and divide by the Euclidean x/y distance between pose shoulders 11 and 12. If shoulder width is at most 0.01, the scale falls back to 1.0. The trainer returns 258 zeros when the nose x and y are both zero; browser missing-pose handling is not identical. Training/inference parity needs further validation.

## Temporal transformation

Python extraction uses 30 linearly spaced frame indices. The browser uses linear interpolation of a variable-length live capture to 30 frames, with repeated padding for fewer than two frames. These operations are related but not identical. Browser hands use an exponential moving average with alpha 0.65 and a brief missed-frame grace period; these measures cannot guarantee robust occlusion handling.

## Training augmentation

The trainer uses Gaussian jitter (0.005 and 0.012 standard deviations), random scaling from 0.85 to 1.15, piecewise temporal warping, up to four-frame trimming at each boundary with resampling, x mirroring with hand-buffer swapping, and combined scaling/jitter (0.008). Augmentation may alter linguistic distinctions; no semantic validation of mirrored samples is recorded.

See [dataset provenance](dataset.md), [LSTM model](model.md) and [live inference](inference.md).

## Source evidence

- [ml/src/preprocessing/keypoint_extractor.py](../ml/src/preprocessing/keypoint_extractor.py)
- [ml/src/training/train_lstm.py](../ml/src/training/train_lstm.py)
- [frontend/src/App.jsx](../apps/frontend/src/App.jsx)
