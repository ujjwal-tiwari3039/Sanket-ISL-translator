# Phase 0: model, export and evaluation audit

## Artifact facts verified locally

Keras `models/training/action.h5` and browser topology agree:

```text
Input (None,30,258)
LSTM 64 tanh, return_sequences=True
Dropout .4
LSTM 128 tanh, return_sequences=True
Dropout .4
LSTM 64 tanh
Dense 64 relu → Dropout .4 → Dense 32 relu → Dense 263 softmax
```

Both labels files are byte-identical: 263 contiguous indexed labels, 263 unique strings, no `idle`. The browser manifest contains 15 float32 tensors, 245,831 parameters, and one 983,324-byte shard. The shard is tracked in Git and exists locally. Direct HDF5 dataset versus TFJS little-endian tensor comparison found **zero mismatches across all 15 tensors**. This establishes weight integrity, not complete cross-runtime prediction parity.

Node TFJS loaded the shipped model using `tf.io.fromMemory` and produced finite `(1,263)` scores for a zero `(1,30,258)` tensor. Zero input prediction is only a load/shape smoke test, not sign recognition evidence. Model metadata says Keras 3.15.1 and TFJS converter 4.22.0; the Docker helper's TensorFlow 2.15/converter 4.17 environment is not evidence of the artifact's original environment.

## Training behavior

`train_lstm.py` derives classes from sorted directories containing numeric subdirectories and writes cleaned labels **before** loading/training succeeds. Missing frame files are replaced by zeros. No schema/version, duplicate, source, signer or finite validation occurs.

Each original produces seven variants before a 90/10 stratified random split (falling back to unstratified). There is no fixed split seed or global RNG setup. Related recordings therefore can cross train and held-out partitions. `X_test` is used for early stopping and final classification reporting; there is no untouched test partition. No split manifest proves which sample trained a shipped checkpoint.

Jitter and scale apply to nonzero visibility as well as coordinates. Mirror negates X and swaps hands but does not swap anatomical pose pairs. Temporal interpolation may blend zero missing groups into apparent detections. Idle generation borrows source frames without recording their lineage and adds noise to visibility/missing slots. None of this establishes safe sign-label invariance under mirroring.

Training uses inverse-frequency class weights, Adam .0005 with clipnorm 1, batch 64, up to 120 epochs, patience 25 on validation categorical accuracy, restored best weights. Source/signer balancing is absent. No separate checkpoint recovery or candidate/deployment promotion boundary exists.

## Export and labels

Training overwrites deployed Keras/TFJS destinations. Conversion monkey-patches optional TensorFlow Decision Forests modules and patches JSON layer keys/weight names. Exceptions become warnings, potentially leaving a new Keras model with an old/partial browser export. There is no atomic artifact bundle or preprocessing-version manifest.

Class cleaning removes numeric prefixes after directory sorting. Uniqueness is not asserted, so future directories can produce duplicate cleaned labels. Existing discoverability checks verify label equality, fixed vocabulary size and parameter count, but do not establish training sample lineage or prediction parity. Runtime App does not validate contiguous labels or output width when loading.

## Evaluation interpretation

Stored `models/training/eval/classification_report.txt` reports rounded .98 accuracy, macro F1 and weighted F1 over 2,944 examples, plus per-class precision/recall and a confusion image. It is a historical development report. Its exact split and model association are not independently reproduced. Given the current training mechanism, it cannot support signer-independent or live generalization claims.

Missing: separate test data, reproducible split/source manifest, top-3 metric, structured metrics JSON, source-wise evaluation, threshold/margin calibration, unknown-sign coverage and confidence reliability. Browser .40 and Python .70 acceptance thresholds are uncalibrated and inconsistent. The absence of an idle output means an exact `idle` suppression condition does not provide an unknown class.

## Required follow-up gates

Preserve the deployed artifact while establishing a canonical preprocessing version. Split original/duplicate groups before augmentation, reserve validation for decisions and test for reporting, and record signer unknown explicitly. Evaluate candidates with top-1/top-3, macro/weighted F1, per-class scores and confusion data. Package labels, preprocessing metadata, hashes and metrics together. Require actual Python/JS preprocessing fixtures and prediction comparisons before promotion. Do not retroactively attach new provenance or new evaluation scores to these legacy weights.
