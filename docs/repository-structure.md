# Repository structure

The existing `apps/`, `ml/src/`, `models/`, `data/`, `docs/` and `tests/` boundaries are preserved. No files were moved merely for appearance.

| Location | Responsibility |
|---|---|
| `apps/frontend/src/App.jsx` | Live/demo ownership, camera/models, bounded capture, context and sentence requests |
| `apps/frontend/src/utils` | Actual imported feature packing, normalization, resampling and recognition decisions |
| `apps/frontend/src/DemoMode.jsx` | Scripted presentation and independent overlay lifecycle |
| `apps/backend/server.js` | Loopback API, validation boundary, streaming, timeout and cancellation |
| `apps/backend/language.js` | Gloss validation, explicit fingerspelling and deterministic fallback |
| `ml/src/preprocessing` | Canonical schema and numeric transforms; shared Tasks extractor |
| `ml/src/data` | Formal sample storage, collection, INCLUDE processing, conversion and validation |
| `ml/src/training` | Original-group splitting, augmentation/weights, candidate training and export |
| `ml/src/evaluation` | Metrics, confusion data and validation threshold reports |
| `ml/src/inference` | Python diagnostic capture and manual source-video segmentation |
| `models/runtime` | Existing MediaPipe task assets |
| `models/training` | Preserved deployed Keras artifact and historical development report |
| `apps/frontend/public/models` | Preserved deployed TFJS model/weights/labels |
| `models/evaluation` | Dataset audit and clearly labeled engineering smoke metrics |
| `data/include`, `data/custom` | Locally generated canonical NPZ samples, created when used |
| `data/processed` | Explicit legacy conversion or optional synthetic examples |
| `tests/ml`, `tests/frontend`, `tests/backend` | Numeric/parity, lifecycle, model and API regression tests |
| `docs/audit` | Pre-change evidence plus subsequent validation notes |

Historical `MP_Data_old_224` files remain tracked; active `MP_Data` is local ignored data. Neither is silently interpreted as verified canonical extraction. Candidate training creates its own output directory and never updates deployment automatically.

Static documentation generation remains in `apps/frontend/scripts/discoverability.mjs`. Its explicit page and asset inventories preserve noindex/production-origin rules and exclude demo media from builds. New pipeline specification pages are published through the same system. Repository audit notes remain source documents, not automatically published assets.

See [architecture](architecture.md), [schema](landmark-schema.md), [training](training.md) and [evaluation](evaluation.md).
