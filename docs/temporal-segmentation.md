# Temporal segmentation

Live workflow is WAITING → arm → detect motion → CAPTURING → PROCESSING → RECOGNIZED or UNCERTAIN → cooldown. Manual Stop remains available after the minimum capture length. With Dynamic Stroke Capture enabled, low-motion hysteresis also stops the capture; disabling it selects manual stopping.

Configuration is in `apps/frontend/src/utils/recognition.js`: sample interval 66 ms, motion start .030, stop .015, ten consecutive low-motion frames, five preframes, four postframes, minimum 20 frames, maximum 300. These are engineering defaults, not calibrated optimal boundaries. Motion is summed XY displacement over wrist and fingertips matched by detector side. It remains sensitive to frame rate, camera distance and hand count. Tracking loss does not prove a sign ended; the confidence/unknown policy remains important.

Only raw detector landmarks enter canonical feature extraction. Display EMA is isolated. All normalized frames are resampled by the same frame-index interpolation as Python. Empty/single-frame windows are rejected and short live captures cannot be manually classified. A manual gesture button prevents an unbounded rolling classifier from repeatedly emitting a held sign. Intentional repeated signs in separate captures are preserved; automatic text deduplication would destroy such repetitions.

Training source clips and user recordings must contain one complete sign with comparable rest boundaries. Stored timestamps permit diagnosis, but v1 interpolation is by frame index, so dropped/stalled camera frames remain a limitation. Existing legacy integer-sampled video windows do not magically acquire identical temporal provenance through conversion.

Face question detection is disabled by default. `VITE_EXPERIMENTAL_QUESTIONS=true` explicitly enables the unvalidated image-height eyebrow-distance heuristic. It is separate from classifier features and must not be cited as learned ISL question recognition.
