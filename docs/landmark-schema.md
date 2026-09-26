# Canonical landmark schema: sanket-258-v1

Implementation: `ml/src/preprocessing/` and `apps/frontend/src/utils/{features,normalization,resampling}.js`. App imports these utilities directly. Mathematical parity is tested by `tests/ml/test_preprocessing_parity.py` against the actual JS adapter.

## Layout

Pose indices 0–32 each store x,y,z,visibility in offsets 0–131. Detector-labeled Left hand indices 0–20 each store x,y,z in offsets 132–194; Right occupies 195–257. Raw and normalized frames are exactly 258 float32 values. A model batch is `(batch,30,258)`, time-major within each sample. Face landmarks are excluded; the optional overlay/experimental question detector is separate.

| Pose index | Name |
|---|---|
| 0 | nose |
| 1 | left_eye_inner |
| 2 | left_eye |
| 3 | left_eye_outer |
| 4 | right_eye_inner |
| 5 | right_eye |
| 6 | right_eye_outer |
| 7 | left_ear |
| 8 | right_ear |
| 9 | mouth_left |
| 10 | mouth_right |
| 11 | left_shoulder |
| 12 | right_shoulder |
| 13 | left_elbow |
| 14 | right_elbow |
| 15 | left_wrist |
| 16 | right_wrist |
| 17 | left_pinky |
| 18 | right_pinky |
| 19 | left_index |
| 20 | right_index |
| 21 | left_thumb |
| 22 | right_thumb |
| 23 | left_hip |
| 24 | right_hip |
| 25 | left_knee |
| 26 | right_knee |
| 27 | left_ankle |
| 28 | right_ankle |
| 29 | left_heel |
| 30 | right_heel |
| 31 | left_foot_index |
| 32 | right_foot_index |

Both hand slots use this ordering:

| Hand index | Name |
|---|---|
| 0 | wrist |
| 1 | thumb_cmc |
| 2 | thumb_mcp |
| 3 | thumb_ip |
| 4 | thumb_tip |
| 5 | index_finger_mcp |
| 6 | index_finger_pip |
| 7 | index_finger_dip |
| 8 | index_finger_tip |
| 9 | middle_finger_mcp |
| 10 | middle_finger_pip |
| 11 | middle_finger_dip |
| 12 | middle_finger_tip |
| 13 | ring_finger_mcp |
| 14 | ring_finger_pip |
| 15 | ring_finger_dip |
| 16 | ring_finger_tip |
| 17 | pinky_mcp |
| 18 | pinky_pip |
| 19 | pinky_dip |
| 20 | pinky_tip |

Names and indices were checked against installed MediaPipe 0.10.14 PoseLandmark and Tasks HandLandmark enums. These are foot-index landmarks, not arbitrary foot centers. Official references: [pose](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker), [hands](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker), [face](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker). Tasks Face Landmarker supplies 478 points when used; classifier width does not depend on face detection.

## Extraction contract

Use unmirrored RGB pixels in both environments. Mirror only the displayed preview if desired. Slots mean **the detector category on these unmirrored pixels**, with no implicit swap; do not infer subject anatomy from screen position. A future anatomical-side conversion requires known-side footage and a new extraction version. Legacy custom samples were flipped before detection and cannot be certified by their shape alone.

Pose lite float16 v1, hand float16 v1 and face float16 v1 browser model bytes were downloaded and SHA-256 compared with `models/runtime`: exact matches. Real-video face extraction returned 478 landmarks. Hashes are in `landmark_schema.py`. Python and browser SDK/WASM are pinned to 0.10.14. VIDEO mode, one pose, two hands, pose detection/presence/tracking .5, hand detection/presence/tracking .4. Python opens a new detector session per independent clip. Frames are unmirrored; world landmarks are not used. Internal MediaPipe tracking remains, but application EMA/carry is display-only.

Missing group: fill its fixed slot with zeros. Missing handedness/unknown label: discard that detection. Multiple detections with the same side: zero that ambiguous side. Never choose based on detection order or reassign an unknown hand to Right. Wrong landmark count, missing coordinate, NaN or infinity: reject. Visibility missing from a pose point defaults to 0; coordinates are not visibility-masked in v1, preserving the shipped model's semantics.

## Spatial preprocessing: nose-xy-shoulder-v1

1. Pack and quantize raw features to float32.
2. If nose x=y=0, return all 258 zeros, including hands (legacy model policy).
3. Compute 2D shoulder distance from pose 11 and 12 using float64 arithmetic. Use distance if greater than .01; otherwise use 1.
4. For each pose/hand point with x or y nonzero, set `(x,y)=((x-nose_x)/scale,(y-nose_y)/scale)` and round output to float32.
5. Leave z and visibility unchanged. Preserve zero groups. Do not normalize a normalized sample again.

XY originate in image-width/height units; normalized XY can be outside [0,1]. Pose z and hand z keep their respective MediaPipe depth conventions; they are not common metric world coordinates. Nose-origin sentinel, unreliable anchors, unscaled z and aspect-ratio sensitivity are deliberate legacy limitations, not claims of optimal features. Altering them requires a versioned retraining experiment.

Legacy 1692 layout was pose 132 + face 1434 + Left 63 + Right 63. `convert_legacy_frame` explicitly validates that shape, removes face and applies this normalization. It does not establish extraction provenance or detector parity.

## Temporal preprocessing: frame-linear-30-v1

Capture/extract at most one frame per 66 ms. For N normalized frames and target 30, output t uses position `t*(N-1)/29`, floor/next indices, linear interpolation in float64, and float32 output. Endpoints remain unchanged. Empty/single-frame inputs are rejected. Live capture requires at least 20 observed frames before evaluation. Temporal interpolation also interpolates visibility/missing slots; this behavior is versioned, not a physical claim about occluded motion. Acquisition timestamps must be stored for diagnosing stalls. The v1 resampler uses frame index, not elapsed time.

Training consumes already normalized 30-frame canonical samples. Existing integer-sampled legacy files retain unknown temporal provenance. Equivalence of numeric transformations is proven within absolute/relative tolerance 1e-6; equality of detector outputs across runtime implementations or real signing accuracy is a separate validation task.

## Physical handedness validation protocol (pending operator results)

Open `http://127.0.0.1:5173/?landmarkDebug`. This uses the actual live
App extractor, normalization and model; no synthetic input is substituted.
White P0–P32 marks pose; cyan L0–L20 and orange R0–R20 mark **detector
categories**. These are not proof of anatomical handedness. Unknown categories
are marked `?`. The diagnostic panel reports actual counts, finite features,
occupied canonical slots and the last resampled sequence dimensions.

With shoulders visible, test anatomical left only, right only, both, neither,
crossed hands, and palms facing toward/away from the lens. Repeat near/far and
bright/dim; record distance in metres and lighting description, counts and
missed/wrong-side detections. Press Record Next Sign, gesture, then stop and
confirm sequence `[30,258]`, finite true, followed by an inference result.

The current preview and overlay use CSS `scaleX(-1)`; detector input comes
from the original video element, without pixel reflection. To compare display
mirroring, use browser DevTools to toggle that CSS on **both** video and canvas;
this must not change input semantics. The index text counter-reflects for the
default selfie preview. Actually reflected camera pixels are outside the
canonical unmirrored extraction profile; do not correct them by silently
swapping labels or mix their samples into training.

Automated category packing: `node --test tests/frontend/handedness.test.mjs`.
This proves slot assignment and detection-order independence, not the detector's
anatomical accuracy. With an isolated visible Chromium on debugging port 9224,
`node tests/frontend/physical-camera-probe.mjs` reads live diagnostics without
saving camera images. Record operator observations alongside that output.

Operator observation on 2026-09-26 (ACER laptop webcam): anatomical left-only
showed cyan L, right-only orange R, and both were reported correctly labeled.
The actual App also produced a finite `[30,258]` captured sequence. This validates
the observed default unmirrored-input/selfie-preview case only; varied lighting,
distance, crossed-hand behavior and toggled-preview comparison remain unverified.
