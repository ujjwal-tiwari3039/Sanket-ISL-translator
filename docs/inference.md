# Browser inference and local sentence generation

Live recognition runs in the browser using `tf.loadLayersModel('/models/model.json')` and `/models/labels.json`. TensorFlow.js receives a float tensor shaped `[1, 30, 258]`; the output maps to the ordered label dictionary.

## Real-time processing

The webcam requests 1280 × 720 input. The inference loop uses requestAnimationFrame and skips processing until 66 milliseconds have elapsed. This is a scheduling gate, not measured frame rate or end-to-end latency. Actual throughput depends on camera, browser, hardware and model execution.

The active path waits for arming and hand motion at or above 0.030, then records until the user explicitly stops it. After classification it counts down 15 processed frames before returning to idle. Source constants for pre/post padding, minimum capture length and low-velocity stopping are unused in the active loop; they are not implemented behavior. The UI stroke-mode toggle does not select a separate rolling classifier in this loop.

## English sentence generation

The frontend submits a sequence array to local Express at port 3001. Express merges consecutive single-letter entries and streams `gemma2:2b` output from local Ollama. Its error fallback joins words, capitalizes and adds punctuation; it is not a trained translator. The backend has no explicit request timeout.

## Privacy and connectivity

The reviewed frontend processes webcam images as browser landmarks and does not upload frames in its application request path. Recognized text is sent to the assembly endpoint. External hosts receive asset/font requests, which expose normal network metadata. No blanket privacy guarantee or security certification is established.

Inference computation is local in the supplied localhost setup, but the application is **not a verified offline application**. WASM/task assets and fonts are externally hosted and there is no service-worker offline installation. Self-hosting every dependency and testing with the network disabled would be necessary to claim offline operation.

See [installation](installation.md), [architecture](architecture.md), [deployment](deployment.md) and [limitations](limitations.md).

## Source evidence

- [frontend/src/App.jsx](../frontend/src/App.jsx)
- [backend/server.js](../backend/server.js)
- [frontend/src/index.css](../frontend/src/index.css)
