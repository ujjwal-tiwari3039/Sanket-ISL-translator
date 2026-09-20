# Research methodology and future work

Sanket ISL Translator explores whether pose and hand trajectories can connect selected Indian Sign Language signs to English labels in an interactive browser application, followed by local sentence generation.

## Methodology

MediaPipe converts video into landmark coordinates. The classifier uses 258 pose and hand features per frame, spatial x/y normalization and 30-frame temporal input. Three LSTM layers model sequence changes. A Dense softmax head produces class probabilities. English synthesis is a separate language-model step receiving a sequence of labels.

## Evidence and reproducibility

The repository includes source, label maps, model topology/weights and a development classification report. It does not contain a reproducible signer-independent evaluation, raw-data lineage manifest or formal paper about Sanket. The [dataset publication](https://doi.org/10.1145/3394171.3413528) concerns INCLUDE and is not an evaluation of Sanket.

## Recommended next experiments

Split original recordings by signer before augmentation; preserve an untouched test set. Record data checksums, split identifiers, dependency versions and seeds. Compare Python/browser feature tensors and predictions on the same fixtures. Measure per-class recognition errors, rejection behavior and sentence fidelity separately, then measure end-to-end latency on documented hardware. Test complete offline operation only after self-hosting all required assets.

## Future work

Evaluate continuous signing and non-manual linguistic features, review region/signer representation with ISL users, establish licensing for code and assets, and assess generated-sentence faithfulness. These are proposed experiments, not implemented capabilities.

See [architecture](architecture.md), [dataset](dataset.md), [limitations](limitations.md) and [citation](citation.md).

## Source evidence

- [ml/src/training/train_lstm.py](../ml/src/training/train_lstm.py)
- [models/training/eval/classification_report.txt](../models/training/eval/classification_report.txt)
