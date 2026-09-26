"""Versioned feature contract. See docs/landmark-schema.md."""
SCHEMA_VERSION = "sanket-258-v1"
PREPROCESSING_VERSION = "nose-xy-shoulder-v1"
SEQUENCE_VERSION = "frame-linear-30-v1"
FEATURE_DIM = 258
SEQUENCE_LENGTH = 30
POSE_NAMES = (
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
    "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
    "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index",
    "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel",
    "right_heel", "left_foot_index", "right_foot_index",
)
HAND_NAMES = (
    "wrist", "thumb_cmc", "thumb_mcp", "thumb_ip", "thumb_tip",
    "index_finger_mcp", "index_finger_pip", "index_finger_dip", "index_finger_tip",
    "middle_finger_mcp", "middle_finger_pip", "middle_finger_dip", "middle_finger_tip",
    "ring_finger_mcp", "ring_finger_pip", "ring_finger_dip", "ring_finger_tip",
    "pinky_mcp", "pinky_pip", "pinky_dip", "pinky_tip",
)
MODEL_HASHES = {
    "pose_landmarker.task": "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
    "hand_landmarker.task": "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1",
}
EXTRACTION_PROFILE = dict(
    mediapipe_version='0.10.14', model_hashes=MODEL_HASHES, running_mode='VIDEO',
    mirrored=False, handedness='detector-native-unmirrored', hand_confidence=.4,
    pose_confidence=.5, smoothing='mediapipe-only', missing_hand='zero', ambiguous_hand='zero',
)
