"""Pack detector-native side labels into stable slots; no smoothing or mirroring."""
import numpy as np
from .validation import validate_frame


def _value(point, name, default=None):
    return point.get(name, default) if isinstance(point, dict) else getattr(point, name, default)


def _landmarks(points, count, channels):
    if len(points) != count:
        raise ValueError(f"Expected {count} landmarks, got {len(points)}")
    values = []
    for point in points:
        for channel in channels:
            value = _value(point, channel, 0.0 if channel == "visibility" else None)
            if isinstance(value, (bool, str)) or not isinstance(value, (int, float, np.number)):
                raise ValueError(f"Invalid {channel} coordinate")
            values.append(value)
    return validate_frame(np.asarray(values, dtype=np.float32), count * len(channels))


def build_raw_features(pose=None, hands=()):
    """Unknown sides are ignored; duplicate side detections zero that ambiguous slot."""
    result = np.zeros(258, dtype=np.float32)
    if pose is not None and len(pose):
        result[:132] = _landmarks(pose, 33, ("x", "y", "z", "visibility"))
    candidates = {"Left": [], "Right": []}
    for hand in hands:
        if hand.get("label") in candidates:
            candidates[hand["label"]].append(_landmarks(hand["landmarks"], 21, ("x", "y", "z")))
    for label, offset in (("Left", 132), ("Right", 195)):
        if len(candidates[label]) == 1:
            result[offset:offset + 63] = candidates[label][0]
    return validate_frame(result)


def from_mediapipe(pose_result, hand_result):
    poses = pose_result.pose_landmarks
    if len(hand_result.hand_landmarks) != len(hand_result.handedness):
        raise ValueError("Hand landmark/handedness counts differ")
    hands = [dict(label=categories[0].category_name if categories else None, landmarks=points)
             for points, categories in zip(hand_result.hand_landmarks, hand_result.handedness)]
    return build_raw_features(poses[0] if poses else None, hands)
