# Model Artifacts

This directory contains trained model artifacts for Sanket ISL Translator.

## Structure

```text
models/
├── training/
│   ├── action.h5                   Keras checkpoint (training source artifact)
│   └── eval/
│       ├── classification_report.txt   Development evaluation report (2,944 samples)
│       └── confusion_matrix.png        Confusion matrix visualization
├── runtime/
│   ├── pose_landmarker.task        MediaPipe Pose Landmarker task file
│   ├── hand_landmarker.task        MediaPipe Hand Landmarker task file
│   └── face_landmarker.task        MediaPipe Face Landmarker task file
└── labels.json                     Shared label map (263 ISL classes, 0-indexed)
```

## Training Artifacts (`training/`)

`action.h5` is the Keras source checkpoint. The TensorFlow.js browser runtime is exported separately into `apps/frontend/public/models/` from the historical training run. Current `ml/src/training/train_lstm.py` writes isolated candidates instead of overwriting deployment.

The classification report is a development artifact. See [evaluation limitations](../docs/limitations.md) before citing these numbers.

## Runtime Artifacts (`runtime/`)

MediaPipe `.task` files are required by the Python training/inference scripts. The browser application loads MediaPipe models from CDN, not from this directory.

## Browser Runtime (`apps/frontend/public/models/`)

The TensorFlow.js classifier used by the browser application lives in:
```text
apps/frontend/public/models/
├── model.json                      TensorFlow.js topology
├── group1-shard1of1.bin            Model weights
└── labels.json                     Label map (copy of models/labels.json)
```

The `models/labels.json` and `apps/frontend/public/models/labels.json` must remain synchronized. The discoverability check verifies this at build time.

## Label File

`labels.json` maps integer indices to ISL sign labels (263 total, no idle class). See [vocabulary documentation](../docs/vocabulary.md).
