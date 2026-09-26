# Training candidates

Install `ml/requirements-training.txt` in a Python 3.11 environment. All commands run from the repository root.

```bash
python -m ml.src.data.validate_dataset data/include data/custom
python -m ml.src.training.train_lstm data/include data/custom --output models/candidates/run-01 --epochs 120 --seed 42 --include-weight 1 --custom-weight 1
```

The output directory must not exist. Training never overwrites `models/training/action.h5` or the deployed frontend model. Input must be metadata-bearing normalized `(30,258)` NPZ samples. Extraction profiles must match. Legacy-only experiments require explicit `--allow-legacy`; their provenance remains unknown.

The LSTM 64/128/64 and Dense 64/32 architecture is retained, with dropout .4. Class labels are sorted once and written with the candidate, TFJS export and evaluation. Early stopping/checkpointing uses validation loss; the independent test partition is evaluated after training. RNG seed and deterministic TensorFlow operations are set. Checkpoints allow recovery/inspection; an automatic resume CLI is not implemented.

Original recordings are split before augmentation. Connected groups share recording identity, exact feature hash or known signer ID; none cross partitions. At least three independent groups are required. The seeded approximately 70/15/15 group split must retain all classes in training. Small validation/test partitions may lack classes; per-class support exposes that limitation. Unknown signer IDs are never fabricated. Counts refer to original samples, not augmented variants.

Only training receives coordinate jitter. Visibility and zero missing entries remain unchanged. Mirroring is not enabled because sign-label invariance has not been validated. Per-sample weights balance label/source totals: within each label, INCLUDE and custom totals are equally weighted by default regardless of their counts. `--include-weight` and `--custom-weight` adjust that contribution explicitly. Known signer grouping protects evaluation but does not by itself equalize the training signer distribution.

Outputs: `best.keras`, `labels.json`, `metadata.json`, `split_manifest.json`, `history.json`, `tfjs/`, `evaluation/`. The small Sequential exporter writes actual Keras weights and a TFJS layers topology; compare predictions before promoting any candidate. Shipped model files remain a legacy artifact without a recovered source split.

Smoke verification used four legacy classes, at most eight recordings each, one epoch, seed 42. That verifies execution, not a useful trained replacement. Full vocabulary retraining with verified source/signer metadata remains necessary before generalization claims.
