# System architecture

Sanket separates gesture recognition from language generation. Folder boundaries remain `apps/`, `ml/`, `models/`, `data/`, `docs/` and `tests/`.

```mermaid
flowchart TD
    A[INCLUDE source video] --> P[Python LandmarkExtractor: VIDEO mode]
    B[Custom webcam: unmirrored RGB] --> P
    P --> F[Canonical raw 258 features]
    F --> N[Nose XY and shoulder normalization]
    N --> S[Linear resampling to 30 x 258]
    S --> DATA[NPZ features and provenance metadata]
    DATA --> SPLIT[Group original recordings / duplicates / known signers]
    SPLIT --> TRAIN[Train-only augmentation and weighted LSTM fit]
    SPLIT --> VAL[Validation: early stopping and threshold analysis]
    SPLIT --> TEST[Untouched test: metrics and confusion matrix]
    TRAIN --> EXPORT[Candidate Keras / TFJS / labels / metadata]
    C[Browser webcam] --> MP[Matching Tasks assets and settings]
    MP --> JS[Equivalent JS packing and normalization]
    MP --> DRAW[Display-only smoothing and face overlay]
    JS --> CAP[Arm / motion / bounded capture / hysteresis]
    CAP --> RS[Same 30-frame interpolation]
    RS --> MODEL[Deployed TFJS model]
    MODEL --> ACCEPT[Confidence and unknown decision]
    ACCEPT --> CONTEXT[Gloss context and explicit fingerspelling]
    CONTEXT --> API[Loopback Express API]
    API --> OLLAMA[Local Gemma 2 stream]
    API --> FALLBACK[Deterministic fallback before output starts]
    DEMO[Scripted demo manifest] --> PRESENT[Separate presentation component]
```

Python numeric preprocessing is import-safe under `ml/src/preprocessing`. Dataset metadata prevents silent profile mixing. Browser `App.jsx` imports the tested pure utilities; it no longer maintains duplicate normalization/resampling code. App mounts either live or demo so camera/model ownership is explicit. Face data never enters the LSTM; the separate question heuristic requires an experimental opt-in.

The candidate exporter never replaces deployed files automatically. Both shipped and candidate export predictions were compared across Keras and TFJS. The shipped model still has legacy training provenance; it is not retroactively certified by the new pipeline.

The browser sends only text tokens to `http://127.0.0.1:3001/api/assemble`. Express binds loopback and calls local `gemma2:2b` at port 11434 with timeout/cancellation. External MediaPipe assets/fonts prevent a verified offline claim. Demo overlays can use MediaPipe, but words and final sentences come from the manifest.

See [schema](landmark-schema.md), [capture](temporal-segmentation.md), [data](custom-dataset.md), [training](training.md), and [evaluation](evaluation.md).
