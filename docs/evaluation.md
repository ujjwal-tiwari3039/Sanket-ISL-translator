# Evaluation and claims

Each candidate training run writes `evaluation/metrics.json`, `confusion_matrix.csv`, ordered `labels.json`, `evaluation_report.md`, and `validation_thresholds.json`. Metrics include top-1/accuracy, top-3, macro and weighted F1, per-class precision/recall/F1/support and source-wise slices of the same held-out partition.

Validation thresholds report coverage and selective accuracy for confidence/margin combinations. They do not automatically change deployment thresholds. The existing live .40 threshold is retained and explicitly uncalibrated. Closed-set held-out samples cannot establish rejection rates on unknown signs. Real unknown, noisy and non-sign footage is still needed.

The old report under `models/training/eval` used augmentation before splitting and reused held-out examples for early stopping. Its rounded .98 score is historical development evidence, not a live or signer-independent accuracy claim. New candidate reports state whether all signer IDs are known. Legacy data remains marked unknown provenance even after conversion.

Numeric parity checks:

```bash
python -m unittest discover -s tests/ml -v
node --test tests/frontend/*.test.mjs
```

`test_preprocessing_parity.py` runs the actual JS adapter on shared landmark fixtures at tolerance 1e-6. `test_fidelity.py` compares Keras and TFJS shipped-model outputs at absolute 1e-5 / relative 1e-4. Neither test establishes semantic sign correctness. Optional real-video integration:

```bash
SANKET_VIDEO_TEST=apps/frontend/public/test_videos/happy_MVI_5263.MOV python -m unittest discover -s tests/ml -p test_mp.py -v
```

Reports for a one-epoch engineering smoke run are under `models/evaluation/smoke/`, labeled accordingly. No candidate was deployed.

### Confidence follow-up

Live acceptance is strictly `top1 > confidence` and `top1 - top2 >= margin`.
The validation sweep now uses the same strict boundary (formerly `>=`). Defaults
remain 0.40 and 0; neither has been calibrated on independent canonical data.
Set `VITE_INFERENCE_CONFIDENCE` and `VITE_INFERENCE_MARGIN` before starting/building
Vite to configure them. Invalid or out-of-range settings fail explicitly.
Candidate training writes `confidence_statistics.json` with correct/incorrect
confidence and margin distributions and the threshold grid. No automatic
threshold selection occurs. Select using a provenance-verified validation set
including unknown signs, then report once on untouched test data. Legacy smoke
metrics cannot justify a deployment threshold.

### Browser validation recorder

Open `http://127.0.0.1:5173/?landmarkDebug` and use the **Validation recorder**:

1. Select the intended vocabulary label, or **Random / no known sign**.
2. Enter a signer alias and conditions (distance, lighting) in the notes field.
3. Use the existing Record Next Sign control, perform the gesture, and stop.
4. Check the saved count and recent result. Repeat both successes and failures;
   do not discard failures to improve apparent accuracy.
5. Export JSON before refreshing, closing the page, or entering demo mode.

Labels/notes are frozen at motion onset. The session holds at most 100 completed
trials; additional captures still run inference but are not retained. Export and
refresh to start a new session. Disabling the selector stops trial retention.
Exports contain normalized `[30,258]` model inputs, all scores in exported label
order, top three predictions, acceptance thresholds, margin, timestamps, source
frame count and pose/hand detection fractions over the actual captured frames
(including pre/post padding). Detection coverage means exactly one detector
category for that hand, not ground-truth anatomical correctness. No images or
video are recorded, and nothing is uploaded automatically.

These are `sanket-validation-v1` evidence records, not canonical training NPZs.
The deployed artifact hash is not captured; retain the corresponding model files
with the export. Notes are operator annotations, not independently verified
signer identities. Sessions are not automatically split for calibration/testing.
Use separate untouched sessions/signers for final evaluation. The existing
motion-gated capture cannot start on a motionless/no-hand scene; random hand
motion can be tested, but this does not cover every unknown-input condition.
