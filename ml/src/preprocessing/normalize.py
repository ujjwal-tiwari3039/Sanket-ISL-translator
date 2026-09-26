"""Legacy-compatible XY normalization, separated from raw packing."""
import math
import numpy as np
from .validation import validate_frame


def normalize_keypoints(raw):
    result = validate_frame(raw).astype(np.float32, copy=True)
    validate_frame(result)
    nx, ny = float(result[0]), float(result[1])
    if nx == 0 and ny == 0:
        return np.zeros(258, dtype=np.float32)
    dx = float(result[44]) - float(result[48])
    dy = float(result[45]) - float(result[49])
    width = math.sqrt(dx * dx + dy * dy)
    scale = width if width > 0.01 else 1.0
    for index in (*range(0, 132, 4), *range(132, 258, 3)):
        x, y = float(result[index]), float(result[index + 1])
        if x != 0 or y != 0:
            result[index] = (x - nx) / scale
            result[index + 1] = (y - ny) / scale
    return validate_frame(result)


def convert_legacy_frame(raw):
    """Structural conversion only; this does not certify legacy provenance."""
    array = validate_frame(raw, 1692)
    return normalize_keypoints(np.concatenate((array[:132], array[1566:1692])))
