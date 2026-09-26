# SANKET implementation and verification audit

Baseline: `e9db6f3e854e29e2db5be959c48b245123fa951f`. Work preserves the structured repository and existing deployed model. This report distinguishes implemented engineering changes from unverified recognition/generalization claims. Phase 0 evidence is in `docs/audit/`.

## What was broken and changed

| Problem / cause | Change |
|---|---|
| Separate Python/JS normalization, including different missing-pose behavior | Versioned canonical 258-feature pipeline; actual App imports tested JS utilities; shared fixtures demonstrate numeric parity. |
| Browser display smoothing and stale hands entered classifier tensors | Classifier receives raw detector landmarks; EMA remains visual only. |
| Ambiguous/unknown handedness could overwrite or shift slots | Fixed side slots; unknown side ignored; duplicate side zeroed independent of detection order; malformed counts rejected. |
| SDK/WASM version mismatch | Browser SDK pinned to 0.10.14, matching WASM and Python. Downloaded pose/hand/face model bytes exactly matched Python SHA-256; real-video face extraction returned 478 landmarks. |
| Custom mirrored pixels, no sample metadata, several stale extraction paths | Unmirrored canonical collection/re-extraction, model hashes/settings, source/recording/signer metadata, timestamps, atomic NPZ storage. Downloader and segmenter reuse canonical extraction. |
| Legacy files silently assumed compatible | Explicit conversion with unknown-provenance marker; loading requires acknowledgement and refuses incompatible profiles. Original data preserved. |
| Augmentation before split and test used as validation | Original/duplicate/known-signer groups split first; augmentation only in train; distinct validation and test; seed, manifests, candidate checkpointing. |
| Visibility corrupted by augmentation and source imbalance | Coordinate-only jitter preserves visibility/zero entries; configurable label/source total weighting. Unvalidated mirroring disabled. |
| Model export could overwrite deployment and silently fail | New candidate directory required; explicit Sequential TFJS export; labels/config/metrics stay with candidate; cross-runtime prediction check. |
| Unused temporal thresholds and unbounded capture | Minimum/maximum lengths, actual pre/post padding and optional low-motion hysteresis; uncertainty appends no word. Threshold .40 retained, not claimed calibrated. |
| Camera/models survived demo transitions; uncancelled async work | Separate live/demo mounting, resource ownership and cleanup, request cancellation and retained newly added context. |
| Arbitrary API tokens, no Ollama timeout, fallback appended to partial output | Bounded validated tokens, loopback server, timeout/disconnect cancellation, incremental stream parsing; fallback only before output begins. |
| Name letters ambiguous with ordinary single-letter words | Explicit name/acronym token groups, repeated letters preserved, legacy U-J-J-W-A-L supported, ordinary I/A preserved. |
| Face heuristic could alter primary outputs without validation | Experimental opt-in; off by default; no face features in classifier. |
| Scripted demo confidence randomized | Deterministic manifest generation; UI states scripted output, not a model score. Experimental motion-manifest generator remains separate. |
| Stale tests and documentation | Assertion suites, video integration option, browser lifecycle check and updated commands/specifications. |

## Verified evidence

- All 110,370 active legacy frames scanned: 3,679 sequences / 263 classes, zero malformed/nonfinite/visibility errors, zero exact duplicate normalized sequence groups. Report: `models/evaluation/dataset_report.json`.
- Canonical packing/normalization/resampling agrees between Python and JS within 1e-6, including missing pose/hands, swapped detection order, ambiguous sides and degenerate shoulders.
- All 15 shipped Keras/TFJS tensors match exactly. Both shipped and newly exported candidate models load and predict; observed cross-runtime deltas in initial smoke checks were below 2e-8. Automated shipped prediction tolerance is absolute 1e-5 / relative 1e-4.
- Retained `happy` and `year` videos produced canonical samples; `deaf` was rejected for no usable hands. These are extraction checks, not independent accuracy evidence.
- Four-class, one-epoch training/export/evaluation smoke completed. The reproducible subset has 30 original samples, four test samples, top-1 **0.0**, macro F1 **0.0**, top-3 **0.5**. Reports are in `models/evaluation/smoke`. These deliberately reported poor/tiny metrics prove execution only; no candidate was deployed.
- Python unit/model/video suite: all 15 tests passed with real-video integration enabled, including shipped-vocabulary validation, canonical extraction and both shipped/new-export prediction parity. The optional video test is skipped only when `SANKET_VIDEO_TEST` is unset.
- Frontend: 6 preprocessing/recognition/capture checks pass. Backend: 6 token/vocabulary/fingerspelling/API/streaming/timeout checks pass. Frontend lint passes with zero warnings; build passes with the existing large-bundle advisory. Documentation checks pass: 24 static pages, 491 internal links, 145 repository links. `git diff --check` passes.
- Fresh lockfile installs and frontend build/documentation checks passed in an isolated source snapshot without existing node_modules, build output, secrets or optional demo media. Freshly installed backend dependencies passed its API suite. This verifies the JS build path; a full fresh Python environment install was not run.
- Real browser synthetic-camera check passed model initialization, camera start, live camera shutdown on demo entry, fresh live stream on return and absence of uncaught exceptions.
- Actual local `gemma2:2b` streamed “My name is Ujjwal.” through Express from the structured letter sequence. HTTP 200, no fallback header. This checks integration, not universal sentence fidelity.

## Remaining limitations and technical debt

A physical webcam was unavailable (`/dev/video*` absent). No real-user live-sign recognition or manual webcam collection result is claimed. Known-side annotated footage is still needed to establish anatomical handedness; current slots explicitly preserve detector categories on unmirrored inputs. Historical samples cannot recover missing signer, mirroring, detector or frame-timing provenance.

The shipped weights remain trained by the legacy pipeline. Its old rounded .98 report remains compromised by leakage/validation reuse. Full verified-data retraining and signer-independent evaluation are not complete. Threshold sweeps exist but smoke/closed-set validation is insufficient to calibrate unknown-sign rejection. The .40 acceptance threshold is unchanged. Frame-index resampling remains sensitive to uneven/stalled capture cadence; thresholds and segmentation are engineering heuristics, not proven sign boundaries.

Known-signer grouping protects partition separation but training does not yet balance every signer within each label/source. Metadata/checksum validation cannot establish semantic label truth or anatomical side consistency without source imagery. Synthetic idle examples are optional and explicitly retain parent recording groups; they do not substitute for real unknown-sign data.

MediaPipe assets and fonts remain network-loaded, so fully offline operation is not verified. Face-question detection remains experimental. Generated English can change meaning. Docker/fresh Python training dependency installation has not been exhaustively validated on all platforms; the working local environment and exact candidate package versions are recorded. Automatic checkpoint resume/promotion and official INCLUDE partition import remain future work.

## Reproduction commands

From the repository root, Node 22.12+ and Python 3.11:

```bash
npm --prefix apps/frontend ci
npm --prefix apps/backend ci
python -m venv .venv
.venv/bin/pip install -r ml/requirements-training.txt
.venv/bin/python -m unittest discover -s tests/ml -v
npm --prefix apps/frontend test
npm --prefix apps/backend test
npm --prefix apps/frontend run lint
npm --prefix apps/frontend run build
npm --prefix apps/frontend run check:discoverability
```

Separate terminals for the application:

```bash
ollama serve
# If not already installed: ollama pull gemma2:2b
npm --prefix apps/backend start
npm --prefix apps/frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Data and verified-profile training:

```bash
.venv/bin/python -m ml.src.data.data_collection --camera 0 --label hello --samples 100 --signer-id signer-01
.venv/bin/python -m ml.src.data.process_include --videos /path/to/include --output data/include
.venv/bin/python -m ml.src.data.validate_dataset data/include data/custom
.venv/bin/python -m ml.src.training.train_lstm data/include data/custom --output models/candidates/run-01 --seed 42 --include-weight 1 --custom-weight 1
```

Reproduce the limited legacy engineering smoke using fresh output directories:

```bash
.venv/bin/python -m ml.src.data.convert_legacy --input MP_Data --output /tmp/sanket-smoke-input --acknowledge-unknown-provenance --max-classes 4 --max-samples-per-class 8
.venv/bin/python -m ml.src.training.train_lstm /tmp/sanket-smoke-input --output /tmp/sanket-smoke-output --allow-legacy --epochs 1 --batch-size 8 --seed 42
.venv/bin/python -m ml.src.data.validate_dataset MP_Data --legacy
SANKET_VIDEO_TEST=apps/frontend/public/test_videos/happy_MVI_5263.MOV .venv/bin/python -m unittest discover -s tests/ml -p test_mp.py -v
```

Browser lifecycle verification needs a running frontend and an isolated test Chromium (never a personal browser profile):

```bash
brave-origin --headless=new --no-sandbox --disable-dev-shm-usage --enable-unsafe-swiftshader --use-angle=swiftshader --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --remote-debugging-port=9223 --user-data-dir=/tmp/sanket-browser-check about:blank
node tests/frontend/browser-smoke.mjs
```

The final architecture diagram is in `docs/architecture.md`. User changes to `netlify.toml` and the untracked logo were preserved. No deployment, Git commit/push, dataset deletion or deployed-model replacement was performed.

## Physical validation follow-up — 2026-09-26

This supersedes the earlier statement that a physical webcam was unavailable:
the sandbox hides `/dev/video*`, but host access confirmed an ACER HD User Facing
camera at `/dev/video0`. A visible isolated browser, without a fake camera,
opened the actual frontend with `?landmarkDebug`. The diagnostic probe observed
an active 1280×720, 30 FPS camera track, 33 pose landmarks, and 258 finite features.
At that observation zero hands were detected and no gesture sequence had been
captured. This is **partial physical evidence**, not a passed end-to-end check.
Operator left/right/both-hand, distance/lighting, selfie display, and captured
`[30,258]` inference checks remain pending. The view is available for those checks.

Added opt-in landmark indices and category colors to the existing live overlay,
actual tensor counters, and a standalone read-only browser diagnostic probe.
The manual protocol is in `docs/landmark-schema.md`; category-slot tests do not
establish anatomical correctness. No semantic side swap or motion threshold
change was made.

Found and corrected one calibration inconsistency: Python threshold sweeps used
`>=` but live acceptance uses `>`. Regression tests cover the exact 0.40 boundary.
Added correct/incorrect confidence and margin summaries for future candidate
validation, plus validated Vite confidence/margin configuration. Defaults remain
unchanged; no threshold was selected and no empirical calibration result is
claimed. Available historical samples have unknown extraction provenance; the
previous smoke reports are not independent deployed-model validation evidence.

No retraining, new evaluation metrics, model comparison or deployment occurred
in this follow-up: the requested physical/handedness prerequisite remains open.
Existing grouping handles identical sequences, recording IDs and known signers;
near-duplicate grouping is still an outstanding prerequisite for the requested
verified training run. Verified INCLUDE/custom data inventories, near-duplicate
review, frozen splits and validation calibration are needed before training.
The earlier smoke configuration/results remain execution evidence only.

Focused commands: `node --test tests/frontend/handedness.test.mjs`,
`node --test tests/frontend/recognition.test.mjs`,
`venv/bin/python -m unittest discover -s tests/ml -p test_confidence.py -v`,
`npm --prefix apps/frontend run lint`, and the physical probe described above.

Follow-up verification results: both handedness checks and all three recognition
checks passed; both Python confidence checks passed; frontend lint and production
build passed (existing large-bundle advisory); `git diff --check` passed. These
focused results do not replace the pending operator camera validation.

### Operator evidence — 2026-09-26, 09:31 UTC

The operator reported anatomical left hand displayed cyan indices, anatomical
right hand orange indices, and both hands displayed the correct labels together.
This supports category-to-anatomical-side agreement for the tested laptop camera
and default selfie preview; it does not establish accuracy across all poses.

Operator-provided actual App diagnostics at `2026-09-26T09:31:19.270Z` showed
pose count 33, feature dimension 258, finite frame values, unmirrored input and
mirrored preview. The retained capture at `2026-09-26T09:30:30.234Z` showed
sequence shape `[30,258]` and finite values. Thus physical-camera capture through
canonical sequence construction is manually confirmed. The later live frame
had no hands and zero hand slots; this does not describe hand presence during
the earlier recorded sequence. The sequence diagnostic is written before model
prediction, so it does not by itself verify successful model inference.

Subsequent operator confirmation: after stopping capture, the UI displayed a
word and returned to Record Next Sign. The operator confirmed that word matched
the performed sign. Together with the captured diagnostics, this establishes
one manually verified physical webcam → MediaPipe → canonical 258 features →
finite [30,258] sequence → model inference → matching displayed word test.
The sign label, confidence and number of trials were not recorded; this is an
observed successful case, not an accuracy estimate or threshold calibration.

Still pending: distance and lighting observations, and explicit preview-mirroring
toggle comparison.
Confidence calibration and verified retraining remain incomplete. No model
accuracy, new threshold, or training result follows from this operator evidence.

Additional operator feedback: recognition was reported to perform well for
`happy`, `cow`, `healthy`, `high`, `baby`, `family`, `afternoon`, and `good`.
Other, as-yet-unspecified signs produced incorrect results. Trial counts,
confidence scores, capture conditions and intended/predicted pairs were not
recorded, so no accuracy or per-class success rate can be computed. Recognition
quality is mixed; signing technique, capture/landmark behavior and classifier
limitations remain possible causes, not established diagnoses. These observations
are not a calibration dataset. Thresholds and deployed weights remain unchanged.

The operator subsequently named `shoes`, `crowd`, `grandfather`, `it`, `lawyer`,
`store`, and `shop` among signs that did not perform well, plus unspecified others.
Verified deployed label indices: shoes=113, crowd=222, grandfather=181, it=112,
lawyer=230, and the combined class `store or shop`=61. These concepts are in the
supported vocabulary; store/shop are not separate classes. Root and browser
label maps match. Actual predicted words and scores remain unavailable, so these
reports cannot establish a confusion matrix or diagnose the cause. A displayed
`store or shop` for either intended synonym would be a valid label match.


### Reported false acceptance: shirt/random motion → shoes

The operator reports attempting `shirt` or random gestures and seeing `shoes`.
Both shirt (104) and shoes (113) exist in the deployed vocabulary. This is
reported misclassification/false acceptance, not evidence of operator error.
Without per-capture scores or recorded inputs the cause remains undetermined;
it does not establish that every new capture predicts shoes rather than a prior
result remaining visible. The existing strict >0.40 confidence gate and zero
margin requirement are uncalibrated. A softmax score is not proof that an input
belongs to the known sign vocabulary. The model includes `extra`, but its presence
does not establish effective rejection of arbitrary gestures.

The opt-in diagnostic sequence now retains the completed prediction's top three
labels/scores, top-one/top-two margin, accepted flag and completion timestamp.
Previously the frame-status update overwrote the transient top-three debug line.
This instrumentation distinguishes a new model result from a stale displayed word
and supports collecting failure evidence. No threshold or weight was changed.

### Debug validation recorder implementation

Added an opt-in recorder within the existing live debug view, using the actual
inference sequence and scores, with intended-label/random-motion selection and
condition notes frozen at capture onset. Source-frame observations are associated
by frame identity, preserving pre/post-padding coverage. Exports retain full
scores/label order, top three, margin, acceptance settings, timestamps, exact
normalized sequence and pose/hand coverage. Sessions are local memory only,
limited to 100 trials, and exported explicitly as JSON. No camera media is saved.
Normal inference, capture thresholds and deployed weights are unchanged.

Files: `apps/frontend/src/App.jsx`, `apps/frontend/src/utils/validationRecorder.js`,
`tests/frontend/validationRecorder.test.mjs`, and `docs/evaluation.md`.
Three regression checks cover exact sequence copies and coverage, unknown false
acceptance/known rejection, and malformed/unlabeled input. All four frontend test
files pass; lint, production build and whitespace checks pass. Build retains its
existing bundle-size advisory. Physical operator use of the new export controls
has not yet been verified; no newly collected calibration results are claimed.

Limitations: export before refresh/demo; recordings after the 100-trial cap are
not saved; motionless no-hand trials cannot start through existing motion gating;
model artifact hashes are not embedded. Exports are validation evidence, not
training samples or an automatically independent evaluation split.
