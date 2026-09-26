# Phase 0: repository audit

Audit date: 2026-09-26. Baseline commit: `e9db6f3e854e29e2db5be959c48b245123fa951f`.

This is an evidence baseline, not a claim that the requested remediation phases are complete. No application, dataset, model, or configuration changes were made during this phase. Existing deletion of `netlify.toml` and untracked `apps/frontend/src/assets/raiotlogo.jpeg` were preserved.

## Scope and execution map

The local checkout is the audited implementation. Inventory covers tracked source, configuration, documentation, scripts, model artifacts, tests, and both local landmark datasets. Installed dependencies and generated assets were inspected where relevant, not treated as maintained source. Historical notes are not evidence that their described fixes exist in this checkout.

| Area | Actual entry point and behavior |
|---|---|
| Frontend | `apps/frontend/src/main.jsx` mounts `App` under React StrictMode. `App.jsx` owns camera, model loading, extraction, capture, classification and sentence submission. |
| Browser utilities | `src/utils/normalization.js` and `resampling.js` duplicate inline App functions; App imports neither. Testing only these files would not prove the live path. |
| Demo | `DemoMode.jsx` reads manifest words, confidence and sentences; MediaPipe is for overlays. No classifier or Ollama inference generates its displayed text. |
| Backend | `apps/backend/server.js`: Express JSON → array check → letter merger → local Ollama streaming → text response/fallback. |
| Extraction | `ml/src/preprocessing/keypoint_extractor.py` creates three Tasks detectors at import time, then opens webcam in `main`. |
| Dataset | Collection, INCLUDE processing, manual segmenter and download script independently implement extraction. All write legacy `MP_Data/<class>/<sequence>/<frame>.npy`. |
| Training | `ml/src/training/train_lstm.py` executes loading, augmentation, split, training, export and evaluation at module scope. |
| Python inference | `ml/src/inference/realtime_inference.py` uses raw 1692-feature windows against the shipped 258-feature model. |
| Build | Vite invokes `scripts/discoverability.mjs`; explicit public-asset allowlist includes TFJS artifacts, excludes demo footage, generates static docs and empty production demo manifest. |
| Tests | Two Python scripts under `tests/ml`, neither a proper assertion suite; old paths and incompatible preprocessing. Backend test command deliberately exits 1. Frontend has lint/build/discoverability checks but no recognition test command. |

## Findings and affected files

| ID | Priority | Confirmed issue | Responsible location |
|---|---|---|---|
| A01 | Critical | Augmented relatives cross the random split; validation is also the reported test set. | `ml/src/training/train_lstm.py`, augmentation loop before `train_test_split` |
| A02 | Critical | Python live inference sends `(1,30,1692)` to `(None,30,258)` model without normalization. | `ml/src/inference/realtime_inference.py`, `extract_keypoints`/`main` |
| A03 | High | Missing pose produces zeros in training but raw hands in JS; direct fixture reproduces 0.5 maximum difference. | Training `normalize_keypoints`; App `extractKeypoints`; utility normalizer |
| A04 | High | Browser smoothing, stale-hand carry and cross-label matching alter classifier features. Training has none. | App `drawLandmarks` → `smoothedHandsRef` → `extractKeypoints` |
| A05 | High | Custom collection flips pixels; INCLUDE does not. Extraction model/version/source metadata absent. | `data_collection.py`, `process_include.py`, downloader |
| A06 | High | Broken relocated paths/imports prevent documented tooling from running. | Collector/segmenter/downloader use `models/*.task`; INCLUDE imports absent `phase1_5_data_collection`; Docker invokes absent `phase2_train_lstm.py`; demo generators and tests use old model/frontend paths. |
| A07 | High | Capture lacks minimum/maximum duration enforcement; declared stop hysteresis/padding are unused. | App `toggleRecording`, `evaluateStroke`, `detectAndPredict` |
| A08 | High | Backend accepts arbitrary array contents, has no timeout/cancellation; fallback can append to partial generated text. | Backend `/api/assemble` |
| A09 | High | Model/landmarker cleanup absent; async loading not cancelled. Demo leaves parent effects mounted; returning does not rerun camera setup for the new video node. | App and Demo effects |
| A10 | Medium | Letter merger cannot distinguish ordinary `I`, `a` from fingerspelling; names/acronyms lose case in fallback. | Backend merger/fallback; App manual letter input |
| A11 | Medium | Fixed face-distance question heuristic mutates labels, including `idle?` bypassing exact idle comparison. | App question flag and evaluation |
| A12 | Medium | SDK range `^1.0.0` with WASM `0.10.14`; incomplete Python requirements and mismatched runtime versions. | Package files, model-loader URLs, requirements, `.gitignore` |
| A13 | Medium | Documentation incorrectly says no training data is committed. 36,480 historical NPY files are tracked. | `data/README.md`, `ml/README.md`, repository-structure docs |
| A14 | Medium | Demo updater fabricates random confidence, so regeneration is not deterministic. | `scripts/demo/update_demo_manifest.js` |

## Frontend and context details

Capture is manual arm → motion trigger → manual stop. The stroke-mode checkbox does not select a different inference path. Low-confidence results still enter COOLDOWN, whose overlay says SIGN RECOGNIZED. There is no distinct uncertain state. Progress counts frames but is rendered as a percentage. Model/camera load errors primarily go to console. Face-mesh checkbox state is captured by an effect without that dependency (lint confirms).

Classification tensors are disposed on success, not in `finally`. Repeated evaluations and in-flight assembly are not protected against stale completion. Assembly does not check HTTP status or set an abort timeout; its completion clears all current context, potentially deleting signs added while the request ran. Clear Context does not cancel outstanding work. Duplicate suppression, typed word boundaries and timed context reset are absent in browser live mode.

Responsive CSS exists; no visual redesign is warranted by the audit. Camera-dependent accessibility, keyboard/focus behavior and responsive browser rendering remain runtime checks for later phases.

## Baseline checks actually run

| Check | Result |
|---|---|
| `npm --prefix apps/frontend run lint` | Exit 0; 17 warnings, including dead capture constants and effect dependencies. |
| `npm --prefix apps/frontend run build` | Pass; large bundle warning. |
| `npm --prefix apps/frontend run check:discoverability` | Pass: 19 static pages, 390 internal links, 149 repository links, model/labels and asset checks. |
| `node --check apps/backend/server.js` | Pass; syntax only. |
| Read every NPY in both datasets using `venv/bin/python`, `np.load(..., allow_pickle=False)` | Structural results in data audit. |
| Read HDF5 and compare all 15 weight tensors with TFJS binary | Exact equality; details in model audit. |
| Load shipped TFJS topology/weights with Node TFJS and predict zeros | Finite `(1,263)` output from `(1,30,258)` input. Smoke check only. |
| Extract training normalizer via Python AST; compare missing-pose fixture to JS normalizer | Mismatch reproduced. |
| Execute existing letter merger on fixtures | `U J J W A L` → `UJJWAL`; ordinary `I a` → incorrect `Ia`. |

No retraining, benchmark, webcam recording, full browser session, clean-checkout install, or actual Ollama request was performed in Phase 0. Default Python lacks ML dependencies; existing `venv` has NumPy 2.1.3, MediaPipe 0.10.14, TensorFlow 2.19.0 and h5py 3.14.0, but no pytest. Syntax/build success does not establish recognition reliability.

## Remediation order and completion gates

Preserve `apps/`, `ml/src/`, `models/`, `data/`, `docs/`, `tests/`. First version the existing 258-feature mathematical contract, prove detector handedness/mirroring with known-side footage, and introduce tested shared Python preprocessing plus an imported JS counterpart. Quarantine unproven legacy data behind explicit conversion/provenance status. Then repair collection/loaders, split originals by source/duplicate/signer before augmentation, and export candidate models without overwriting the deployed artifact. Fix capture/lifecycle and language handling against regression fixtures. Finally rerun complete build, integration, parity and evaluation gates and update public documentation and FINAL_AUDIT.md.

The later phase gates remain open. See [pipeline](pipeline-audit.md), [landmarks](landmark-audit.md), [model](model-audit.md), and [data](data-audit.md).
