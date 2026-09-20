# Repository Structure

This document describes the current repository organization of Sanket ISL Translator following the 2026-09-20 architecture refactor.

## Previous Structure

Before the refactor, the repository mixed concerns at the root level:

```text
/
├── frontend/          React application
├── backend/           Express server
├── models/            Mixed training + runtime artifacts
├── docs/              Documentation
├── phase1_*.py        ML data collection scripts
├── phase2_train_lstm.py  ML training script
├── phase3_*.py        ML inference scripts
├── requirements.txt   Python dependencies
├── generate_demo_*.js Demo generation utilities
├── download_and_extract.py  Dataset download script
├── train_in_docker.sh  Docker training wrapper
├── test_*.py          Python tests at root
├── MOTION_SIGN_BOUNDARY_FIX.md  Historical engineering note
├── PROGRESS.md        Historical development log
├── trace.md           Historical architecture trace
└── codex_trial.md     Historical audit context
```

Python ML scripts, demo utilities, dataset scripts, historical notes and application code all coexisted at the root level.

## New Structure

```text
Sanket-ISL-translator/
│
├── apps/
│   ├── frontend/                 React application + discoverability infrastructure
│   │   ├── public/               Static assets served by Vite dev and production build
│   │   │   ├── models/           TensorFlow.js classifier (topology, weights, labels)
│   │   │   ├── demo/             Demo manifest and video footage (footage excluded from production)
│   │   │   ├── screenshots/      Interface screenshots for documentation
│   │   │   ├── favicon.svg       Project favicon
│   │   │   ├── social-preview.png/svg  Social media preview image (1200×630)
│   │   │   └── discovery.css     Stylesheet for generated static documentation pages
│   │   │
│   │   ├── scripts/              Build + discoverability infrastructure (stays with frontend)
│   │   │   ├── discoverability.mjs    Static documentation generator / Vite plugin
│   │   │   ├── build-production.mjs  Production-origin gate
│   │   │   └── check-discoverability.mjs  Build verification checks
│   │   │
│   │   ├── src/
│   │   │   ├── utils/
│   │   │   │   ├── normalization.js  Keypoint coordinate normalization (pure function)
│   │   │   │   └── resampling.js     Temporal sequence resampling (pure function)
│   │   │   ├── components/       (reserved for future component extraction)
│   │   │   ├── pages/            (reserved for future page extraction)
│   │   │   ├── hooks/            (reserved for future hook extraction)
│   │   │   ├── services/         (reserved for future service extraction)
│   │   │   ├── data/             (reserved for future static data)
│   │   │   ├── App.jsx           Main application (camera, MediaPipe, LSTM, translation)
│   │   │   ├── DemoMode.jsx      Scripted demo presentation
│   │   │   ├── App.css           Application styles
│   │   │   ├── index.css         Root CSS variables and layout
│   │   │   └── main.jsx          React entry point
│   │   │
│   │   ├── index.html            HTML entry point with discoverability placeholders
│   │   ├── vite.config.js        Vite configuration with discoverability plugin
│   │   ├── package.json          Frontend dependencies and scripts
│   │   └── package-lock.json     Locked dependency tree
│   │
│   └── backend/
│       ├── server.js             Express server: /api/assemble endpoint + Ollama proxy
│       ├── package.json          Backend dependencies
│       ├── package-lock.json     Locked dependency tree
│       └── README.md             Backend API documentation
│
├── ml/
│   ├── src/
│   │   ├── preprocessing/
│   │   │   └── keypoint_extractor.py   MediaPipe landmark extraction pipeline
│   │   ├── training/
│   │   │   └── train_lstm.py           LSTM training, augmentation, TFLite.js export
│   │   ├── inference/
│   │   │   ├── realtime_inference.py   Python real-time inference (development tool)
│   │   │   └── segmenter.py            Gesture segmentation utilities
│   │   └── data/
│   │       ├── data_collection.py      Webcam-based keypoint collection
│   │       ├── automated_scraper.py    YouTube search and download helper
│   │       └── process_include.py      INCLUDE dataset extraction pipeline
│   ├── configs/                    Reserved for YAML/JSON training configuration files
│   ├── requirements.txt            Python dependencies
│   └── README.md                   ML pipeline documentation
│
├── models/
│   ├── training/
│   │   ├── action.h5              Keras checkpoint (source training artifact)
│   │   └── eval/
│   │       ├── classification_report.txt  Development evaluation report
│   │       └── confusion_matrix.png       Confusion matrix
│   ├── runtime/
│   │   ├── pose_landmarker.task   MediaPipe Pose Landmarker (Python scripts)
│   │   ├── hand_landmarker.task   MediaPipe Hand Landmarker (Python scripts)
│   │   └── face_landmarker.task   MediaPipe Face Landmarker (Python scripts)
│   ├── labels.json                Authoritative label map (263 ISL classes)
│   └── README.md                  Model artifact documentation
│
├── data/
│   ├── manifests/                 Future: dataset manifests and checksums
│   ├── samples/                   Future: small verified reference samples
│   └── README.md                  Data directory documentation (what is/isn't tracked)
│
├── scripts/
│   ├── demo/
│   │   ├── generate_demo_manifest.py   Python demo manifest generator
│   │   ├── generate_demo_sentences.js  Demo sentence generation helper
│   │   └── update_demo_manifest.js     Demo manifest updater
│   ├── dataset/
│   │   └── download_and_extract.py     INCLUDE dataset download and extraction
│   └── maintenance/
│       ├── configure-github.sh         GitHub repository settings helper
│       └── train_in_docker.sh          Docker-based training environment
│
├── tests/
│   ├── ml/
│   │   ├── test_fidelity.py      Model fidelity tests
│   │   └── test_mp.py            MediaPipe integration tests
│   ├── frontend/                  Reserved for frontend tests
│   └── backend/                   Reserved for backend tests
│
├── docs/
│   ├── about.md                   Project purpose and audience
│   ├── architecture.md            System architecture overview
│   ├── article.md                 Technical article: vision to English
│   ├── citation.md                How to cite and reference the project
│   ├── dataset.md                 Dataset provenance and licensing status
│   ├── deployment.md              Build and deployment guide
│   ├── discoverability.md         Discoverability implementation reference
│   ├── faq.md                     Frequently asked questions
│   ├── glossary.md                ISL recognition terminology glossary
│   ├── how-it-works.md            End-to-end pipeline walkthrough
│   ├── index.md                   Documentation index
│   ├── inference.md               Browser inference documentation
│   ├── installation.md            Setup and usage guide
│   ├── limitations.md             Known limitations and caveats
│   ├── model.md                   LSTM model documentation
│   ├── overview.md                Project overview
│   ├── preprocessing.md           Landmark preprocessing pipeline
│   ├── repository-structure.md    This file
│   ├── research.md                Research methodology and gaps
│   ├── vocabulary.md              Complete 263-label vocabulary
│   └── history/                   Historical engineering notes (not authoritative)
│       ├── MOTION_SIGN_BOUNDARY_FIX.md   Historical boundary analysis
│       ├── PROGRESS.md                   Development log
│       ├── trace.md                      Architecture trace notes
│       └── codex_trial.md                Codex audit context
│
├── .github/                        (directory exists for future workflows/templates)
├── README.md                       Project overview and quick start
├── CHANGELOG.md                    Version history
├── DISCOVERABILITY_REPORT.md       Discoverability implementation inventory
├── CONTRIBUTING.md                 Contribution guidelines (if present)
├── project.json                    Machine-readable project identity
├── netlify.toml                    Netlify deployment configuration (not deployed)
├── .env.example                    Environment variable template
├── .gitignore                      Git ignore rules
└── mise.toml                       Runtime version management
```

## Directory Meaning

| Directory | Contains |
|-----------|----------|
| `apps/frontend/` | The React browser application users interact with, plus all discoverability/build infrastructure |
| `apps/backend/` | The local Express server that proxies to Ollama for sentence assembly |
| `ml/` | Python machine-learning pipeline: extraction, training, inference |
| `models/` | Trained artifacts (Keras), runtime assets (MediaPipe .task), shared labels |
| `data/` | Dataset placeholders and manifests (actual data gitignored) |
| `scripts/` | Repository utilities: demo, dataset, maintenance |
| `tests/` | Test files organized by layer (ML, frontend, backend) |
| `docs/` | Audited technical documentation consumed by the discoverability generator |
| `docs/history/` | Historical engineering notes (not authoritative, marked as historical) |

## Frontend Architecture

The frontend application lives in `apps/frontend/src/`. The main application file `App.jsx` handles:

- Webcam lifecycle (start/stop, stream management)
- MediaPipe model loading (Pose, Hand, Face Landmarkers via CDN)
- TensorFlow.js LSTM model loading from `public/models/`
- Feature extraction: landmark assembly → 1692 features → 258-feature trim
- Nose-relative, shoulder-width-normalized coordinate normalization
- Temporal smoothing (exponential moving average on face/hands)
- Stroke capture state machine: IDLE → ARMED → RECORDING → EVALUATING → COOLDOWN
- Time-normalized sequence resampling (variable-length → 30 frames)
- LSTM inference and top-3 candidate display
- Sentence assembly via backend API (streaming)
- Fingerspelling input merging

Two pure utility functions have been extracted to `src/utils/`:
- `normalization.js` — coordinate normalization (no state, no React)
- `resampling.js` — sequence resampling (no state, no React)

`DemoMode.jsx` is the scripted demo presentation with explicit disclosure that all outputs are pre-scripted, not live recognition.

**Important**: The capture state machine does NOT automatically stop recording. Capture is explicitly started (spacebar/button) and explicitly stopped by the user. This is preserved behavior.

## Backend Architecture

`apps/backend/server.js` is a single-file Express 4 server:
- `POST /api/assemble` — accepts a word sequence, proxies to local Ollama `gemma2:2b`, streams chunked response
- Fingerspelling letter merging before LLM prompt construction
- Graceful text-formatting fallback when Ollama is unavailable
- `GET /` — health check

No route/service split was introduced; the backend is small enough that forced architecture would add complexity without benefit.

## ML Architecture

Python scripts are organized under `ml/src/` by pipeline stage:

| Stage | Directory | Scripts |
|-------|-----------|---------|
| Data | `ml/src/data/` | Collection, scraping, INCLUDE processing |
| Preprocessing | `ml/src/preprocessing/` | MediaPipe landmark extraction |
| Training | `ml/src/training/` | LSTM training, augmentation, TFLite.js export |
| Inference | `ml/src/inference/` | Python real-time inference, segmentation |

All scripts run from the **repository root** (not from `ml/`). Paths are relative to root.

Scripts were renamed from `phase1_*`, `phase2_*`, `phase3_*` to semantic names. Implementation is unchanged.

## Model Architecture

| Location | Contents | Purpose |
|----------|----------|---------|
| `models/training/action.h5` | Keras checkpoint | Source training artifact |
| `models/training/eval/` | Classification report, confusion matrix | Development evaluation |
| `models/runtime/*.task` | MediaPipe task files | Python scripts only |
| `models/labels.json` | Authoritative label map | Shared source of truth |
| `apps/frontend/public/models/` | TFLite.js topology + weights + labels | Browser runtime |

The browser application does NOT use MediaPipe `.task` files from `models/runtime/`. It loads MediaPipe from CDN and TensorFlow.js from `public/models/`.

## Data Architecture

Training datasets are gitignored and not committed:
- `MP_Data/` — primary training keypoint sequences (gitignored)
- `MP_Data_old_224/` — historical variant (rights/maintenance review pending)

`data/` provides the structural placeholder for future manifests and samples.

## Documentation Architecture

All documentation in `docs/` is read by `apps/frontend/scripts/discoverability.mjs` during the Vite build. The documentation generator:
- Reads Markdown from `docs/{slug}.md`
- Generates static HTML pages (`/docs/{slug}/index.html`)
- Produces Markdown alternatives for machine readers
- Generates `llms.txt`, `llms-full.txt`, `sitemap.xml`, `robots.txt`
- Injects JSON-LD structured data, Open Graph and Twitter metadata
- Rewrites relative Markdown links to absolute public URLs

Historical files in `docs/history/` are NOT consumed by the generator and do NOT appear in the public site.

## Discoverability Preservation

The following systems are unchanged from the prior Codex implementation:

- ✅ `apps/frontend/scripts/discoverability.mjs` — authoritative static site generator (preserved, paths updated)
- ✅ `apps/frontend/scripts/build-production.mjs` — production-origin gate (preserved)
- ✅ `apps/frontend/scripts/check-discoverability.mjs` — build verification (preserved, paths updated)
- ✅ 19 public HTML routes — all present and verified
- ✅ `llms.txt` generation — preserved
- ✅ `llms-full.txt` generation — preserved
- ✅ `sitemap.xml` generation — preserved (empty when no production origin)
- ✅ `robots.txt` generation — preserved
- ✅ JSON-LD structured data — preserved
- ✅ Open Graph + Twitter metadata — preserved
- ✅ Canonical URL handling — preserved
- ✅ `noindex` preview behavior — preserved (builds without SITE_URL remain noindex)
- ✅ Production-origin gate — preserved (SANKET_PRODUCTION=1 requires SITE_URL)
- ✅ Static documentation pages (JavaScript-independent) — preserved
- ✅ Social preview image (1200×630 PNG) — preserved in `apps/frontend/public/`
- ✅ `discovery.css` static stylesheet — preserved
- ✅ Demo media excluded from production build — preserved
- ✅ Public asset safety inventory — preserved and extended to new paths

Path changes made to support `frontend/` → `apps/frontend/` relocation:
- `discoverability.mjs`: root URL updated from `../../` to `../../../`; publicRoot updated to `apps/frontend/public`
- `check-discoverability.mjs`: root URL updated from `../../` to `../../../`; dist path updated to `apps/frontend/dist`
- `netlify.toml`: all `frontend` prefix references updated to `apps/frontend`
- All `docs/*.md` relative links updated from `../frontend/` to `../apps/frontend/`
- `README.md` screenshot, badge and directory references updated
