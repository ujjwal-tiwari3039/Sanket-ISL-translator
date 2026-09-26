# Browser inference and local sentence generation

TFJS loads `/models/model.json` and a contiguous, unique label map. Runtime checks require input `[batch,30,258]` and matching output/label width. The deployed model retains 263 labels. Camera processing is gated at 66 ms; this is a scheduling limit, not a latency benchmark.

User arming precedes motion-triggered capture. Minimum/maximum lengths, pre/post padding and optional stop hysteresis are implemented; see [temporal segmentation](temporal-segmentation.md). Classifier inputs use canonical raw detections, while EMA remains in the overlay. Confidence .40 is retained without calibration claims. UNCERTAIN captures add no word; reserved idle/extra/unknown labels are suppressed before any experimental question suffix.

Live and demo mount separately. Camera tracks, animation loops, models, landmarkers and assembly requests are cleaned up. Model failures and unavailable cameras show ERROR. Sentence completion retains signs appended after a request began; Clear Context cancels the outstanding request.

Express validates bounded gloss/name tokens and streams from local Gemma 2. Its 20-second timeout cancels stalled upstream work. Before output starts, failure uses deterministic formatting; a midstream failure interrupts the response instead of appending a contradictory fallback. Names use explicit fingerspelling boundaries; normal `I` and `A` tokens are not merged as a name.

The service binds `127.0.0.1`; local browser origins are allowed. Frames stay in the browser application path and gloss text goes to the local API. External assets and fonts are still fetched, so fully offline operation is not verified. A static host alone cannot supply the user's local Ollama service.

See [installation](installation.md), [architecture](architecture.md), [deployment](deployment.md) and [limitations](limitations.md).
