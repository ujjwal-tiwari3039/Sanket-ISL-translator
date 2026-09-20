# Machine Learning

Python training and inference pipeline for Sanket ISL Translator.

## Structure

```text
ml/
├── src/
│   ├── preprocessing/
│   │   └── keypoint_extractor.py   MediaPipe landmark extraction from video
│   ├── training/
│   │   └── train_lstm.py           LSTM training, augmentation and TensorFlow.js export
│   ├── inference/
│   │   ├── realtime_inference.py   Python-side real-time inference (development tool)
│   │   └── segmenter.py            Gesture segmentation utilities
│   └── data/
│       ├── data_collection.py      Webcam-based keypoint data collection
│       ├── automated_scraper.py    YouTube search and download helper
│       └── process_include.py      INCLUDE dataset extraction pipeline
├── configs/                        Reserved for training configuration files
└── requirements.txt                Python dependencies (see note below)
```

## Running

All scripts are designed to run from the **repository root**, not from `ml/`. Paths are relative to the root.

```bash
# From repo root
pip install -r ml/requirements.txt

# Landmark extraction (expects MP_Data/ at root)
python ml/src/preprocessing/keypoint_extractor.py

# Training
python ml/src/training/train_lstm.py
```

## Requirements

`ml/requirements.txt` lists runtime dependencies. Exact reproduction of stored evaluation requires the environment specified in `scripts/maintenance/train_in_docker.sh` (TensorFlow 2.15.0, MediaPipe 0.10.14, Python 3.11).

## Model Output

Training writes:
- `models/training/action.h5` — Keras checkpoint
- `models/training/eval/` — classification report and confusion matrix
- `apps/frontend/public/models/` — TensorFlow.js topology, weights and labels

See [model documentation](../docs/model.md) and [training limitations](../docs/limitations.md).

## Dataset

Training data is not committed to this repository. The pipeline expects `MP_Data/<class>/<sequence>/0.npy` through `29.npy`. See [dataset documentation](../docs/dataset.md) for provenance details.
