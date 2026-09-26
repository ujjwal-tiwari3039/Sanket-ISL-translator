"""Frame-index interpolation shared mathematically with browser inference."""
import math
import numpy as np
from .validation import validate_sequence


def resample_sequence(frames, target_length=30):
    source = validate_sequence(frames, frame_count=None).astype(np.float32)
    if isinstance(target_length, bool) or not isinstance(target_length, int) or target_length < 2:
        raise ValueError("target_length must be an integer >= 2")
    if len(source) < 2:
        raise ValueError("At least two captured frames required; do not invent a gesture")
    result = np.empty((target_length, 258), dtype=np.float32)
    for t in range(target_length):
        pos = t * (len(source) - 1) / (target_length - 1)
        i0 = math.floor(pos)
        i1 = min(i0 + 1, len(source) - 1)
        alpha = pos - i0
        result[t] = (1 - alpha) * source[i0].astype(np.float64) + alpha * source[i1].astype(np.float64)
    return validate_sequence(result, target_length)
