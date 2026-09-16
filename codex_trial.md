# Codex repair log — 16 September 2026

## Follow-up — 17 September 2026

### Personal recognition rejection repair

- Reproduced excessive rejection on the provided `signai-personal-examples2.json` (44 distinct recordings, 15 labels, 13 labels meeting the three-example minimum). The previous universal 0.30 radius rejected distant but otherwise distinguishable examples. Replaced it with a reference-only radius bounded by competing classes; retained ambiguity rejection and two-example support. Profiles are cached for repeated live captures.
- Personal capture now trims empty boundaries and permits held shapes rather than requiring motion before matching. It tolerates a single frame interval up to one second, retaining duration, coverage, timestamp, finite-value and empty-input checks. The general LSTM capture policy is unchanged. These are plausible additional rejection mechanisms; the user's exact live rejection reason was not available.
- Persisted recognizer preference, selected personal mode when importing examples, displayed the active recognizer and added optional startup loading from the supplied vocabulary for fresh browser storage. Existing browser vocabulary takes precedence.
- Added a reproducible export diagnostic and `models/eval/personal_webcam_repair.json`. Each query is excluded from references; three-example classes use two references per diagnostic fold. Baseline: 22 correct, zero incorrect, 19 rejected. Revised: 29 correct, zero incorrect, 12 rejected. These are development data used during repair, not independent live accuracy.
- Browser verification with the production enrollment minimum: eight excluded recordings from the two four-example classes produced seven correct predictions and one rejection. Verified automatic vocabulary loading, mode persistence, safe removal controls, empty-input rejection and no uncaught exceptions. Frontend tests, backend tests, lint, build and whitespace checks pass.

- User clarified that the six intended webcam signs have not yet been tested because earlier changes interrupted saving. No live recognition failure or success is established for those signs.
- Added **Test fresh performance** using the existing capture and recognition pipeline. The expected label is compared only after inference, so it cannot influence the model or personal matcher. Practice attempts never enter the teaching set or confirmed sequence. Results count correct, incorrect and rejected captures, with exportable tracking coverage, model identity and personal example counts. The latest 100 attempts persist across app views until page reload.
- Added **Restart camera** after startup/tracking errors, cleared recording deadlines on tracking failure, and released the camera when tracking fails. Personal examples remain in local storage.
- Added regression coverage for practice result accounting and browser checks that import examples, reload the whole app, verify their preservation and exercise a rejected practice capture without changing stored examples or confirmed words.
- Verification: frontend and backend test suites, five Python tests, lint, production build and diff whitespace checks pass. Browser checks pass for persistence, practice rejection, camera lifecycle, all 16 model examples, model parity (maximum score difference 1.19e-7), sentence-service fallback, and absence of uncaught exceptions or external requests. The 16 predetermined examples produced 10 correct accepted predictions and six rejections. These saved-landmark results do not establish live webcam accuracy.
- Started the installed Ollama service and separately verified actual English drafting through the frontend proxy: `hello`, `friend` returned `Hello, friend.` with mode `draft`. Frontend, backend and Ollama were left running for the user's practice session.

## Scope and baseline

The requested goal is reliable Indian Sign Language recognition for a college demonstration in about eight hours. The long-term goal is continuous ISL-to-English translation. These require different evidence: recognizing isolated training vocabulary does not demonstrate continuous translation or accuracy on a new signer.

The working tree was clean at the start. Existing progress notes, source, model artifacts and extracted data are being inspected. Original model weights and older data will be retained while fixes are evaluated.

## Confirmed findings

1. **Validation leakage:** `phase2_train_lstm.py` creates eight variants of every source clip *before* randomly splitting training and validation. Near-copies of the same recording therefore appear on both sides. Earlier 90–97% scores in progress notes are not evidence of accuracy on unseen videos or signers. No saved source/signer split establishes that the shipped model was independently tested.
2. **Unconditional closed-vocabulary guessing:** the live evaluator accepts one softmax result above 0.70. It has no minimum recording duration, tracking-quality check, runner-up margin or stability check. A softmax score is not a verified probability of correctness and an unfamiliar sign can score highly.
3. **Preprocessing mismatch:** training returns all zeros when pose is missing; browser code retains unnormalised hands. The browser feeds smoothed/carried-forward hands to classification although notes say smoothing is display-only. Training uses raw detections. The browser downloads a lite pose model instead of using the extraction model already on disk.
4. **Runtime dependency mismatch:** installed MediaPipe JS is 1.0.0, but browser WASM is fetched from 0.10.14. Models and WASM are fetched from the internet despite claims of fully offline operation.
5. **Capture lifecycle:** recording waits for motion and then discards the triggering frame; pre-buffer constants exist but are unused. Recording has no duration limit. Model failures are logged without actionable UI errors. Mode switching unmounts the camera element without properly restarting the camera on return.
6. **Sentence assembly:** the frontend does not check HTTP errors and clears words after any streamed response. The language model can invent meaning from incorrectly recognized words. An uncalibrated eyebrow heuristic can turn `idle` into `idle?`, bypassing the idle filter.
7. **Scripted demo:** `DemoMode.jsx` displays manifest words, preassigned confidence values and prewritten sentences on a timeline. It does not invoke the classifier. This must be clearly separated from recognition evidence.

## Changes and verification

### Measurements completed

- `MP_Data` contains **3,679 complete source sequences in 263 classes**, each with 30 saved landmark frames. Class counts range from 3 to 27. There are **no idle labels** in the shipped vocabulary. Browser and Python label maps agree.
- The extraction script deliberately deletes downloaded archives and temporary videos after saving landmarks. This explains why the 52 GB of original videos need not remain. `completed_zips.txt` records 44 archives, but does not establish exact training provenance or signer identities.
- Original shipped model SHA-256: `2b5f7ea32b565dc65ec5d8d8faa856dd335a5491ff7367c71100be9ed31389f0`. This baseline was retained throughout experimentation and backed up in `models/pre_codex/` before the final activation described below.
- On 526 sampled **source recordings**, model fit is 99.62%. These may have trained the model; this is explicitly **not held-out accuracy**.
- On **all-zero input**, the model predicts `paint` with score **0.999943**. On a sampled sequence with its hand coordinates removed, it predicts `market` with score **0.795267**. Neither score is a reliable correctness probability.
- Re-extracting the ten retained `.MOV` test clips using the on-disk tracking models and the training normalization produced **0/10 correct top-one predictions** from the original model. These small older video assets are not an independent representative webcam benchmark. The result nevertheless contradicts treating previous reports as proof of current reliability. See `models/eval/codex_baseline_audit.json` for the preserved original-model result; `codex_audit.json` now follows the active model.
- Real Keras and browser TFJS scores on the same saved input agree to a maximum absolute difference of **7.96e-13**. Conversion is not the principal cause of incorrect words.

### Implemented changes

| Files | Change and reason |
| --- | --- |
| `frontend/src/recognition.js`, `sign_features.py` | Explicit shared 258-feature contract, missing-pose zeroing, raw hand slots, timestamp-based resampling; reject short, empty, motionless, poorly tracked or stalled captures before inference. Require three boundary variants to agree with minimum score and runner-up margin. Reserve `extra`/idle/unknown as non-output labels. Dispose prediction tensors on failure. |
| `frontend/src/vision.js` | Use the same local body/hand model files as extraction and IMAGE mode like extraction. Remove smoothing/stale hands from classifier input and unnecessary face tracking. Validate model input/output dimensions against labels and warm up before enabling capture. |
| `frontend/src/App.jsx` | Replace the broken capture lifecycle. Start manual recording immediately; limit it to eight seconds; provide actionable errors, optional automatic capture with pause/cooldown, and review/discard before adding words. Add undo/removal. Preserve confirmed words through sentence failures. Release/restart camera and tracking resources when changing views. Remove eyebrow-based punctuation and the nonfunctional old stroke checkbox. |
| `frontend/src/personal.js`, `App.jsx` | Add **optional personal example matching**, separate from the original LSTM: 3–6 independent examples per sign, at least two signs, upper-body/hand descriptors and dynamic time warping with rejection for poor or ambiguous matches. Browser-local storage, export/import, and per-sign removal. This is a limited prototype for adapting a small demo vocabulary to the actual signer/camera, not a claim of general ISL translation or measured webcam accuracy. |
| `frontend/src/DemoMode.jsx` | Preserve all presentation videos and supplied captions. Clearly label playback, show usable video/next/back controls, and remove fabricated confidence and simulated recognition/LLM typing. |
| `frontend/scripts/prepare-assets.mjs`, `frontend/package.json` | Copy matching installed MediaPipe WASM and the on-disk extraction models into public assets before development/build. Pin the JS version; assets no longer require a CDN. |
| `frontend/index.html`, `frontend/src/index.css` | Correct app title, remove remote fonts, readable status/help/errors and controls, uncropped camera preview. Browser testing revealed MediaPipe 1.0.0 attempts unsolicited metrics requests; a same-origin connection policy now blocks these and permits local Vite connections. |
| `backend/server.js`, `backend/package.json`, `frontend/vite.config.js` | Provide a working `npm start`, same-origin `/api` proxy, validated inputs, bounded Ollama requests and structured draft/fallback responses. English drafting is optional and labeled as a draft. Failures preserve the confirmed gloss sequence; no words are silently discarded. |
| `training_data.py`, `phase2_train_lstm.py` | Split original recordings and exact duplicates into disjoint train/validation/test partitions **before** augmentation; preserve source hashes and fixed seed. Fix mirroring to swap anatomical pose pairs as well as hands; do not jitter/scale visibility. Save candidate models, labels, history, independent test report and TFJS export in a separate directory. No automatic overwrite of deployed weights. |
| `scripts/audit_model.py`, `models/eval/codex_*.json` | Repeatable model/data/negative-input/video audit and Python/JS feature and inference fixtures. |
| `frontend/tests/recognition.test.mjs`, `backend/tests/assembly.test.cjs`, `tests/test_training_data.py` | Regression checks for negative inputs, inference stability, tensor cleanup, personal matching, assembly failure, leakage and augmentation. |
| `frontend/scripts/check-browser.mjs`, `frontend/scripts/check-export.mjs` | Actual headless-browser smoke checks with a simulated camera, blocked external network, camera teardown/restart, model parity; separate exported-model loading check. |
| `.gitignore` | Ignore reproducible public vision assets and candidate training outputs; keep original model/data files. |

### Verification completed so far

- Frontend build and lint pass. Ten recognition/personal-matching tests, four sentence tests and four Python training-contract tests pass.
- Browser smoke test passes: all models load with external HTTPS blocked; a simulated non-sign recording appends **zero words**; presentation mode stops camera tracks; returning to live starts a fresh camera stream; no uncaught exceptions or external app requests.
- Full source partition preparation: **2,767 train / 456 validation / 456 test**, with a saved manifest in ignored `models/candidate/split_manifest.json`.
- A **four-class, one-epoch smoke training** in `/tmp/signai-training-smoke` completes and exports. The export loads and predicts in TFJS with four matching labels. Its 1/7 test score is just a pipeline smoke check, not a replacement model or useful accuracy result.
- Real webcam signing quality still needs the user's fresh performances. The browser check uses a simulated camera and cannot establish accuracy on their signing. A higher rejection rate and review controls prevent unverified output; they do not repair the pretrained model's generalization by themselves.

### Google SL2T reference

Google's [12 August 2026 SL2T announcement](https://deepmind.google/blog/putting-sign-language-ai-into-users-hands/) describes over 100,000 hours across more than 50 sign languages, landmark-to-text translation, and an initial ASL-to-English product release. The announcement does not supply downloadable SL2T weights. This project's isolated-word training data and LSTM are a different task and scale; adding an English language model cannot recover visual meaning that the recognizer missed. No Google model was downloaded or incorporated.

Further implementation, user-feedback and final verification entries follow below.

### Additional checks and documentation

- Saved `zenodo_files.json` describes **4,292 source videos** (its description explains five additions after the paper). The current folder has **613 fewer recordings**. All listed zip names appear in the completion list, so that list alone does not prove complete extraction. The extraction script can skip failed/unsupported videos and still mark an archive complete; there is no per-video provenance file to reconstruct the historical loss. No 52 GB re-download was attempted before the demo.
- Added `scripts/audit_personal.py` and `frontend/scripts/audit-personal.mjs` to make a **separate-source** personal-matcher diagnostic reproducible. Three examples for each of ten signs were compared against 162 other corpus recordings: **23 correct, 4 incorrect, 135 rejected**. This is poor coverage across those recordings and does **not** establish reliable live performance; the matcher remains an optional small-vocabulary, same-camera/signer experiment. Thresholds were not tuned on these results. See `models/eval/codex_personal_diagnostic.json`.
- Rewrote `README.md` with actual startup instructions, personal-example practice steps, automatic-capture limits, presentation fallback, optional English drafting, measurement caveats and corrected training instructions. It no longer promises flawless demos, continuous translation or an idle class.
- Updated `train_in_docker.sh` to preserve deployed weights and use the candidate export. The Docker workflow was not executed; the existing Python environment's one-epoch training/export was verified instead.
- Replaced the stale `test_fidelity.py` entry point (which sent 1,692 unscaled features to a 258-feature model) with the current audit command.
- Refreshed `frontend/package-lock.json` offline after pinning the installed vision SDK; no dependency downloads or upgrades were performed.
- Browser screenshot inspected at 1440×1000. Adjusted header/action button widths for the existing dashboard layout.
- User clarified they are using their Acer laptop webcam and keeping prerecorded videos as a fallback. The clips remain intact. A live practice check was requested while remaining verification continued; no claim of successful user signing has been made.
- Final lifecycle review added an independent eight-second wall-clock recording deadline (a stalled/hidden camera cannot leave recording open indefinitely), and retained confirmed words and personal/review/drafting preferences when visiting the video library and returning. Automatic capture pauses on view changes.
- The real optional backend started on `127.0.0.1:3001`. Browser requests through `/api` returned health **200**, invalid input **400**, and valid input **200** with the original gloss sequence when Ollama was unavailable. Recognition and word sequence display do not require Ollama.
- Found the installed `gemma2:2b` model (1.6 GB); Ollama itself was stopped. Started the existing local service with the user's tool approval, without downloading a model. Checking actual English drafting as well as the already-tested fallback.
- User asked to continue. Started a **full 263-class candidate training run**, maximum 80 epochs with early stopping, using the repaired source-disjoint pipeline in `models/candidate/`. Existing deployed weights remain unchanged while this is evaluated. Added configurable model/label/report paths to the audit command so candidate reports and fixtures cannot overwrite the original-model evidence.
- Confirmed the optional English service works after starting Ollama: the full browser check now returns an actual **draft**, and no model download was needed.
- Aspect-ratio diagnostic: the retained sample is 224×224. Stretching the old clips to 640×360 before tracking still gave **0/10** correct predictions from the original model. This rules out treating aspect restoration alone as the fix. Diagnostic report: `/tmp/signai-aspect-audit/report.json`; reproducible with `scripts/audit_model.py --videos --restore-aspect --output /tmp/signai-aspect-audit/report.json`.
- Started a second candidate in `models/candidate_upper_body/`, up to 100 epochs, with an explicitly versioned **upper-body-v2** input contract: retain shoulder/elbow/wrist x/y and full hand landmarks, remove facial pose/leg coordinates, pose depth and visibility from the classifier, and scale hand z consistently by shoulder width. This tests whether nuisance features contribute to the camera-domain gap; improvement is not assumed. Added matching Python/JS normalization, artifact metadata and parity checks. Personal-example descriptors and recording-quality checks retain their original contract. Existing model artifacts default to `legacy-v1` and continue to work unchanged.

## Completed candidate training and activation

Both candidate runs completed; their exports load and predict in TFJS. The source partitions are identical, though the runs used different epoch limits. This is a practical candidate comparison, not a controlled attribution of gains to any one feature change.

| Model | Epochs | Best validation | Separate-source test | Old 224px videos |
| --- | ---: | ---: | ---: | ---: |
| Original model | Historical | Leakage affected | No clean split saved | 0/10 |
| Standard landmarks candidate | 80 | 80.92% | **79.39% (362/456)** | **3/10** |
| Upper-body-v2 experiment | 100 | **84.87%** | **82.68% (377/456)** | 0/10 |

Visual inspection confirmed the old videos already contain drawn landmark overlays. Their result is a development diagnostic, not an independent clean-webcam benchmark. The standard candidate was selected because it improved this available decoded-video check; the upper-body candidate's higher dataset score did not transfer to those videos. It remains available for research and was **not promoted**.

The actual default score/boundary policy was checked without threshold tuning on each candidate's presegmented source-test inputs:

| Candidate | Correct accepted | Incorrect accepted | Rejected | Accuracy among accepted | Coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Standard (active) | 300 | 22 | 134 | **93.17%** | 70.61% |
| Upper-body-v2 | 338 | 32 | 86 | 91.35% | 81.14% |

This excludes webcam tracking, recording-quality filtering and automatic sign segmentation. It still contains errors and **does not establish accuracy on the user's live signing**. The source-trained model still has no idle output class; input rejection and review remain essential.

- Added `scripts/audit_prediction_policy.py` and `frontend/scripts/audit-policy.mjs` to compute these policy results using the real JS decision function and Keras scores for the three recording-boundary variants.
- Added `scripts/activate_candidate.py`: validates candidate audit/model hashes, matching labels and disjoint source/content partitions, backs up the original, writes versioned browser weight filenames, synchronizes Python/browser artifacts and preprocessing metadata, and generates predetermined held-out landmark examples.
- Activated the **standard candidate** (`legacy-v1`), run `codex-282c2ff50362`. Model SHA-256: `282c2ff50362a15b9deeb3eff9f8a7251f181f1fb8ab95a547794ca671f1fd15`. Original weights, browser topology/shards, labels and original parity fixture are retained in ignored `models/pre_codex/`. Old public weight shards remain valid for clients with cached original JSON.
- Added `models/preprocessing.json`, `models/eval/codex_active_model.json`, `codex_model_comparison.json`, `codex_baseline_audit.json`, `codex_training_report.json`, and active-model feature/parity fixtures. Candidate-specific detailed reports remain in their ignored training directories. Refreshed the public model JSON and added a versioned weight shard; labels are unchanged.
- Added `frontend/src/DatasetDemo.jsx` and `frontend/public/demo/landmark-examples.json`, reached through **Model examples**. Sixteen sign labels were fixed in advance of playback testing; the first source-test recording of each is used, irrespective of its prediction. The browser animates the real stored coordinates and calls the active classifier, with annotations displayed separately. The manifest's training-run tag must match the model. This supplements the preserved prerecorded video library without inventing recognition results.
- Extended `loadRecognition` with an optional classifier-only load for dataset playback; camera mode still loads body/hand tracking. Added browser checks for the genuine model-example flow.
- Updated README with the active model, measured results, original backup, real model-demo instructions and continuing limitations. The user must reload the live page to replace a model already loaded in browser memory.

## Final startup repair and verification

- A final browser run found `/vision/hand_landmarker.task` returning HTTP 200 **HTML (766 bytes)** instead of the intact 7,819,105-byte task file. Restarting Vite restored the correct response and matching disk/browser SHA-256. The development server's public-file index had become stale during repeated asset copies; this was an asset-serving failure, not corrupt trained weights.
- Changed `frontend/scripts/prepare-assets.mjs` to skip identical files and atomically replace changed assets. A concurrent production build no longer unlinks and recopies every served vision file. Confirmed successful tracker startup after both restart and another production build.
- Hardened `frontend/src/vision.js` to download and validate complete task buffers before MediaPipe initialization and serialize creation across React StrictMode mounts. Invalid HTTP responses now produce a clear file error instead of an opaque WASM ZIP failure. Serialization is defensive lifecycle hardening; it was not established as the cause of this incident.
- Extended `frontend/scripts/check-browser.mjs` with a read-only `--diagnostics` mode that reports served vision-file lengths, headers and hashes. The normal check exercises all 16 predetermined model examples, alongside the existing camera, service and inference-parity checks.
- Preserved both candidate policy summaries in `models/eval/codex_prediction_policy.json`, linked from README. Clarified that the empty-input `paint` finding refers to the original model.
- Final regression run: **15 JavaScript tests and 5 Python tests pass**. Frontend lint, production build and `git diff --check` pass. The build reports a large bundle warning because TensorFlow.js and MediaPipe are bundled locally; it completes successfully.

## Automatic dashboard restoration

- Restored the camera, sign detection, sequence and English drafting dashboard layout. Teaching and practice are collapsed under settings. Detection starts automatically, accepted words are added without mandatory confirmation, and Pause/Resume controls remain available. Optional review and manual capture remain in Detection settings.
- Added an explicit combined recognizer: try saved examples, then the existing 263-class model if personal matching does not accept. Each path keeps its input and acceptance checks; the result displays its actual source. This is a functional integration, not a measured improvement in general webcam accuracy.
- Preserved examples and model assets. Added regression coverage for personal priority, general-model fallback, restricted personal mode, tensor disposal and empty-input rejection. Updated the browser check for automatic startup, collapsed settings, safe example controls, capture timeout, camera lifecycle, dataset inference and sentence service.
