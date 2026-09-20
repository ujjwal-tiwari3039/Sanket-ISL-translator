# Sign recognition model

The shipped TensorFlow.js Layers model is a stacked LSTM sequence classifier. Its topology and weight shapes can be inspected in `frontend/public/models/model.json`.

## Artifact specification

| Component | Verified value |
| --- | --- |
| Input | Batch × 30 frames × 258 features |
| First recurrent layer | LSTM, 64 units, tanh, return sequences |
| Regularization | Dropout 0.4 |
| Second recurrent layer | LSTM, 128 units, tanh, return sequences |
| Regularization | Dropout 0.4 |
| Third recurrent layer | LSTM, 64 units, tanh, final output |
| Dense head | Dense 64 ReLU, Dropout 0.4, Dense 32 ReLU |
| Output | Dense 263, softmax |
| Parameter count | 245,831, calculated from shipped weight shapes |
| Formats | Keras HDF5 training output; TensorFlow.js JSON plus binary shard |

There are three LSTM layers, three Dense layers and three Dropout layers, plus the input layer. The binary shard is `group1-shard1of1.bin`; no quantization metadata appears in the shipped weight manifest, so it is not described as a quantized model.

## Training configuration

`ml/src/training/train_lstm.py` configures Adam with learning rate 0.0005 and clipnorm 1.0, categorical cross-entropy loss, categorical accuracy, batch size 64 and a maximum of 120 epochs. Early stopping monitors validation categorical accuracy with patience 25 and restores best weights. Balanced class weights are computed on training labels.

These are source configuration values, not proof of the exact run that produced every existing artifact. The training script exports HDF5, then TensorFlow.js, and applies compatibility adjustments to input shape and weight names.

## Vocabulary

Both label files contain 263 entries, with matching order. Neither contains an `idle` label. The previous claim of 262 signs plus an idle class was unsupported. The code tests for an idle output, but that does not create an idle class in the artifact. See the [complete shipped vocabulary](vocabulary.md).

## Evaluation interpretation

The stored [classification report](../models/training/eval/classification_report.txt) reports rounded accuracy 0.98 on 2,944 evaluated samples. This is an existing development artifact, not independently reproduced performance. Augmentation precedes the random split, allowing variants of one recording to enter both partitions. The held-out partition is also used for early stopping. There is no separate untouched test set, fixed random seed, signer grouping or artifact provenance linking a specific run to this report. Do not cite this as live accuracy, official INCLUDE benchmark performance or generalization to unseen signers.

See [dataset](dataset.md), [preprocessing](preprocessing.md), [research methodology](research.md) and [inference](inference.md).

## Source evidence

- [ml/src/training/train_lstm.py](../ml/src/training/train_lstm.py)
- [frontend/public/models/model.json](../apps/frontend/public/models/model.json)
- [frontend/public/models/labels.json](../apps/frontend/public/models/labels.json)
