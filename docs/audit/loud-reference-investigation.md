# LOUD reference investigation — 2026-09-29

## Evidence and method

Reference: https://www.youtube.com/watch?v=gFyDUuy1_88, identified through the
operator's @isldictionary channel. A visual contact sheet shows two repetitions,
the second with a LOUD caption. This is not independent linguistic verification.

Loaded `models/training/action.h5` with TensorFlow/Keras, `compile=False`, and
the indexed `models/labels.json`. Loaded each numbered legacy sequence as frames
0–29, converted using the existing `convert_legacy_frame`, and called the model
with `training=False`. Tested the eight operator labels plus crowd and big large.
These are legacy reconstruction checks, not held-out accuracy measurements.

The model recognizes all 125 tested active legacy samples, including 21/21 LOUD
samples. All eight labels from the operator batch match on their stored samples.
This weakens a global label-order or universally broken normalizer explanation;
it does not establish trustworthy training provenance or live generalization.

The same Keras model reproduces the saved browser top-1 result on all 47 operator
trials; maximum absolute score difference is 0.000004106. Swapping only left/right
hand feature blocks gives zero intended-label matches. This counterfactual is not
a valid physical mirroring transform and does not rule out all handedness issues.

## Temporal evidence

Used the actual browser feature and resampling utilities, matching VIDEO-mode
detector configuration and the deployed TFJS model. Extracted the 480×360 reference
at 15 Hz, then resampled each exploratory window to 30×258. Detector state runs
continuously through the clip. These tests bypass live motion gating.

| Window (seconds) | Sampled frames | Top label | Confidence |
|---|---:|---|---:|
| 0.4–2.1 | 26 | big large | 94.1% |
| 2.6–4.4 | 27 | big large | 91.4% |
| 0.6–1.8 | 18 | big large | 68.9% |
| 2.9–4.1 | 18 | loud | 61.1% |

The 18-frame crops are below the canonical collector's 20-frame minimum. They
are sensitivity probes, not accepted collection examples or a proposed threshold.
Selecting a crop after observing predictions is exploratory analysis, not validation.
The previous whole-clip failure must not be interpreted as failure on every possible
segmentation of this reference. Temporal context materially changes the output.

## Remaining uncertainty and next gate

Hand detection is intermittent in the reference. Missing detections can coincide
with hands leaving view or resting; absence alone is not proof of detector error.
Training versus operator hand coverage also differs (for expensive, training left
coverage is 100%, operator mean approximately 0.4%). This could reflect sign
variants, execution, framing, detector behavior or source conventions; not proven
hand swapping. Raw source/signer metadata are unavailable for these legacy samples.

The strongest supported conclusion is poor transfer to this operator/reference,
with demonstrated segmentation sensitivity, rather than an identified single bug.
Next gate: obtain identified source recordings for legacy LOUD, compare movements
and extraction against the reference, and validate boundaries without selecting
them to maximize model scores. Do not globally swap hands, tune thresholds on this
all-failure pilot, or replace weights. Preserve the pilot as diagnostic evidence;
future calibration and evaluation need independent recordings and unknown trials.

Detailed counts, score parity, artifact hashes and window predictions are in
`models/evaluation/legacy-reference-comparison.json`. No live logic, weights,
thresholds or training samples were modified.

## Fresh source comparison

Retrieved the current metadata for Zenodo record 4010759 and its archive directory
using a 65,536-byte HTTP range. Selected the first, middle and last LOUD member
names before scoring: MVI_5177, MVI_9290, MVI_9536. Retrieved only these members,
not the entire 1.3 GB archive. Member CRC32 and uncompressed sizes are checked;
the full archive checksum is recorded but not verified by partial retrieval.
Source and selection metadata: `data/manifests/include-loud-diagnostic.json`.

The inspected MVI_9290 and MVI_9536 clips show spread fingers, whereas the dictionary
clip shows extended index fingers. This is a visible handshape difference, not a
claim about which form is linguistically correct or the geographic origin of a
variant. It is evidence that reference selection matters. The first re-extracted
clip, MVI_9536, produced a finite 30×258 tensor and LOUD at 99.99% with unchanged
weights. Sample membership in historical model training is unknown.

The fixed, score-blind boundary rule (either wrist above mid torso, two-frame
padding) produced two 23-frame dictionary segments. Both predicted BIG LARGE,
92.69% and 92.27%. These meet the 20-frame collection minimum. This fails to support
trimming as a sufficient remedy. The rule was declared before this scoring run,
but the clip had already been inspected: this remains exploratory analysis.

Visual evidence:

- `evidence/loud-landmark-comparison.png`: three numerically selected legacy samples,
  dictionary first repetition and first operator trial, in canonical XY coordinates.
- `evidence/include-loud-9290.jpg`, `evidence/include-loud-9536.jpg`: contact sheets
  derived from INCLUDE by Advaith Sridhar, Rohith Gandhi Ganesan, Pratyush Kumar and
  Mitesh Khapra, [Zenodo source](https://zenodo.org/records/4010759), CC BY 4.0.
  Frames were resized and tiled. No linguistic annotation was added.

Reproduce fresh extraction and scoring into a NEW directory (never deployment):

```sh
venv/bin/python -m ml.src.evaluation.reference_diagnostic \
  --videos data/include/diagnostic-loud/videos --label loud \
  --source include-diagnostic --output /tmp/sanket-loud-recheck
venv/bin/python -m unittest discover -s tests/ml -v
```

The diagnostic CLI reuses the canonical extraction, sample validation and model
loading. It does not train, invent signer IDs, or mix these examples into training.
Original video files and canonical NPZ files remain local ignored data. The official
train/test assignment is not yet retrieved. Do not describe this as independent
test accuracy or use it to choose a confidence threshold.

## Completed fresh INCLUDE diagnostic — 2026-09-29

Downloaded three LOUD members from the official INCLUDE archive by byte range;
validated member CRC32/size and recorded SHA256, source paths and unknown signer/split
in `data/manifests/include-loud-diagnostic.json`. Canonical VIDEO re-extraction produced
finite [30,258] samples from 28,32,29 input frames. Unchanged deployed Keras model:
MVI_5177 LOUD 99.943%, MVI_9290 LOUD 95.557%, MVI_9536 LOUD 99.990%.
This is a diagnostic source-domain result, not independent held-out performance.
Reports: `models/evaluation/include-loud-diagnostic/report.json`.

All three source clips visibly use spread fingers, unlike the extended-index-finger
dictionary example. This supports a reference/training handshape difference for LOUD,
not a judgment of linguistic correctness or an explanation for all 47 failures.
A predeclared pose-based boundary probe produced two valid 23-frame dictionary
segments, both BIG LARGE (~92%); trimming alone did not fix this case.

Added `ml/src/evaluation/reference_diagnostic.py`, reusing canonical extraction and
validation. Added visual evidence and reproduction instructions in
`docs/audit/loud-reference-investigation.md`. Live UI, weights and thresholds unchanged.
Ran `SANKET_VIDEO_TEST=data/include/diagnostic-loud/videos/MVI_9536.MOV venv/bin/python -m unittest discover -s tests/ml -v`: 17 tests passed, zero skipped.
Initial pytest command was unavailable; the repository tests use unittest.
No verified retraining, confidence calibration or signer-independent evaluation claimed.
