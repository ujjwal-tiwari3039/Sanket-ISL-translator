# Phase 0: landmark forensics

## What is actually packed

`keypoint_extractor.py:extract_keypoints`, collector, segmenter and downloader concatenate fixed groups. App `extractKeypoints` performs equivalent slot allocation before normalization, but its hand input comes from smoothing.

| Group | Count × channels | Legacy offsets, inclusive | Classifier offsets, inclusive |
|---|---|---|---|
| Pose | 33 × `(x,y,z,visibility)` = 132 | 0–131 | 0–131 |
| Face | 478 × `(x,y,z)` = 1434 | 132–1565 | Removed |
| Left hand | 21 × `(x,y,z)` = 63 | 1566–1628 | 132–194 |
| Right hand | 21 × `(x,y,z)` = 63 | 1629–1691 | 195–257 |

Thus raw width is **1692**, classifier width **258 = 132 + 63 + 63**. This is proved by allocation/concatenation, training slices `res[:132]` and `res[1566:]`, App slices ending at 1692, stored NPY shape scan, and shipped input topology. No face landmark enters the LSTM. The utility normalizer's comment incorrectly places the right hand beyond 1692; its executable slices are correct.

The counts agree with official [Pose](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker), [Hand](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker), and [Face](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker) task references. Existing code assumes those counts without runtime assertions. Model-produced landmark counts on actual footage remain a Phase 1 check.

## Detectors and provenance

Browser App and Demo load pose **lite float16 v1**, hand **float16 v1**, face **float16 v1** from Google storage. Both use VIDEO mode, up to two hands, first pose/face. Live hand detection/presence/tracking thresholds are .4; Demo uses defaults. WASM URL is pinned to 0.10.14 while package dependency requests `^1.0.0`.

Python requirements and installed environment identify MediaPipe 0.10.14. Python detectors use IMAGE-mode defaults, with two hands. Some use current `models/runtime` paths; several still use absent `models/*.task`. No per-sample record proves the installed version generated legacy data. On-disk files have these SHA-256 hashes:

```text
pose 59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a
hand fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1
face 64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff
```

Filenames/hashes alone do not prove equality to downloaded browser assets or assets used historically. Compare actual model bytes and run known-side reference footage before declaring extraction parity.

## Coordinate and normalization contract currently implemented

Code consumes normalized image coordinates, not metric world landmarks. XY use image-width/height units; z retains the task's depth convention. Pose and hand depth origins are different, so concatenated z is not one world-coordinate system. Visibility is retained for every pose point; no confidence mask removes unreliable pose anchors.

Let `n=(pose[0].x,pose[0].y)`, `s=||pose[11].xy-pose[12].xy||₂`, and `d=s` if `s>.01`, otherwise `1`. For each point whose x or y is nonzero, set `x'=(x-nx)/d`, `y'=(y-ny)/d`. Leave z and pose visibility unchanged. Face XY is needlessly normalized then discarded. The zero-coordinate sentinel also conflates a valid image-origin point with missingness. Anisotropic image-width/height units mean shoulder distance changes with aspect ratio.

Training returns 258 zeros immediately if nose XY is `(0,0)`. JS instead skips normalization but retains hand data. Reproduction used a zero raw vector with left-hand block filled with .5: Python output had 0 nonzero entries; JS had 63; max absolute difference .5. This is a demonstrated parity failure, not floating-point rounding.

## Left/right and missingness

Python assigns category `Left` to the left slot and `Right` to the right slot. Detection order ordinarily does not shift slots. Duplicate side categories overwrite in detection order; unknown categories are ignored. Browser routes every non-Left category into the right slot, including fallback `Hand_0` labels. Its cross-label smoothing fallback can blend a newly detected hand with the previous opposite hand. A later stale entry may overwrite a current slot.

Custom collector flips camera pixels before extraction; INCLUDE and Python webcam inference do not. Browser CSS presentation mirroring does not flip pixels passed to detection. No explicit mirrored-input metadata or canonical conversion exists. Consequently physical/anatomical side correspondence is **not proven**; do not globally swap sides based on an assumption.

Python missing groups are zero-filled. Browser carries hands for up to three missing detections, whereas training lacks that carry. A missing pose with visible hands additionally differs as above. Training augmentation disturbs visibility and can synthesize intermediate hand presence during interpolation.

## Face heuristic

App and Python inference compare vertical differences for pairs `(105,159)` and `(334,386)` to .04 in image-height units. No inter-eye/face-size normalization, neutral calibration, confidence, or validation supports the decision. It is not learned question recognition. Face identity/pose/distance can affect it; false-positive and false-negative rates are unknown. It should be separately flagged experimental before its suffix affects primary gloss context. Exact anatomical naming of these pairs and a complete canonical index specification belong to Phase 1, not an assumption copied from current comments.
