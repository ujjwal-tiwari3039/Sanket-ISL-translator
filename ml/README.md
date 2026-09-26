# Machine learning pipeline

Use Python 3.11 from the repository root. `requirements.txt` covers extraction; `requirements-training.txt` adds training/evaluation dependencies.

- `src/preprocessing`: canonical schema, raw packing, normalization, resampling, validation and shared Tasks extractor.
- `src/data`: custom collection, INCLUDE re-extraction, formal dataset I/O, legacy conversion, validation.
- `src/training`: group splitting, train-only augmentation, source balancing, candidate training/export.
- `src/evaluation`: structured metrics, confusion data, threshold reports.
- `src/inference`: Python manual capture and interactive video segmentation.

```bash
python -m ml.src.preprocessing.keypoint_extractor --camera 0
python -m ml.src.data.data_collection --label hello --samples 15 --signer-id signer-01
python -m ml.src.data.validate_dataset data/custom
python -m ml.src.training.train_lstm data/include data/custom --output models/candidates/run-01
```

Use module execution (`python -m ...`) so shared imports resolve. Importing numeric preprocessing does not open cameras or models. See [schema](../docs/landmark-schema.md), [custom data](../docs/custom-dataset.md), [training](../docs/training.md) and [evaluation](../docs/evaluation.md).
