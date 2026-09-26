# Landmark preprocessing

The canonical classifier frame contains **258** float32 values: pose 33 × `(x,y,z,visibility)`, Left hand 21 × `(x,y,z)`, Right hand 21 × `(x,y,z)`. Slots follow detector category on unmirrored pixels, independent of detection order. Unknown/ambiguous hands never shift slots. Missing pose zeros the normalized frame in both languages; absent hands remain zero.

`ml/src/preprocessing` and imported browser utilities implement the same nose-relative XY transformation, shoulder-width fallback and 30-frame interpolation. Depth and visibility remain unchanged. App display smoothing is not a classifier input. Full index tables, equations, version IDs, model hashes and limitations are in the [landmark schema](landmark-schema.md).

Legacy NPY data is 1692-wide and includes face placeholders; explicit conversion removes those channels. Conversion is not proof of historical extraction compatibility. New collection and INCLUDE video extraction use the same VIDEO-mode detector and versioned normalized NPZ format. Training consumes those samples without a second normalization and augments only after group splitting.

Python/browser fixture parity passes at tolerance 1e-6. Keras/TFJS model prediction parity is separately tested. These establish mathematical agreement, not recognition accuracy or identical detector outputs across every runtime.

See [custom data](custom-dataset.md), [training](training.md), [model](model.md) and [evaluation](evaluation.md).
