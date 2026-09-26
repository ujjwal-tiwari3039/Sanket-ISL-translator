"""Reject malformed features before inference or storage."""
import numpy as np
from .landmark_schema import FEATURE_DIM, SEQUENCE_LENGTH


def validate_frame(frame, dimension=FEATURE_DIM):
    array = np.asarray(frame)
    if array.shape != (dimension,) or array.dtype.kind not in "fiu":
        raise ValueError(f"Expected numeric ({dimension},) frame, got {array.shape}/{array.dtype}")
    if not np.isfinite(array).all():
        raise ValueError("Frame contains NaN or infinity")
    return array


def validate_sequence(sequence, frame_count=SEQUENCE_LENGTH):
    array = np.asarray(sequence)
    if array.ndim != 2 or array.shape[1] != FEATURE_DIM or len(array) < 1:
        raise ValueError("Expected nonempty (frames,258) sequence")
    if frame_count is not None and len(array) != frame_count:
        raise ValueError(f"Expected {frame_count} frames, got {len(array)}")
    if array.dtype.kind not in "fiu" or not np.isfinite(array).all():
        raise ValueError("Sequence must contain finite numeric values")
    return array
