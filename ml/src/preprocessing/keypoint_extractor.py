"""Shared VIDEO-mode detector for canonical collection and inference.

Run from the repository root: python -m ml.src.preprocessing.keypoint_extractor.
"""
from contextlib import ExitStack
from pathlib import Path
import hashlib
import importlib.metadata
import time
from . import from_mediapipe, normalize_keypoints
from .landmark_schema import MODEL_HASHES

ROOT = Path(__file__).resolve().parents[3]


class LandmarkExtractor:
    """Unmirrored RGB input, strictly increasing integer millisecond timestamps.

    A new instance starts a new tracking session. Close it between unrelated clips.
    Face is not required by the classifier and is not loaded here.
    """
    def __init__(self):
        import mediapipe as mp
        from mediapipe.tasks.python import vision
        self.mp = mp
        self._stack = ExitStack()
        self._last_timestamp = -1
        for name, expected in MODEL_HASHES.items():
            path = ROOT / 'models/runtime' / name
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                raise ValueError(f'Model hash mismatch: {path}')
        try:
            self.pose = self._stack.enter_context(vision.PoseLandmarker.create_from_options(
                vision.PoseLandmarkerOptions(
                    base_options=mp.tasks.BaseOptions(model_asset_path=str(ROOT / 'models/runtime/pose_landmarker.task')),
                    running_mode=vision.RunningMode.VIDEO, num_poses=1,
                    min_pose_detection_confidence=.5, min_pose_presence_confidence=.5,
                    min_tracking_confidence=.5)))
            self.hand = self._stack.enter_context(vision.HandLandmarker.create_from_options(
                vision.HandLandmarkerOptions(
                    base_options=mp.tasks.BaseOptions(model_asset_path=str(ROOT / 'models/runtime/hand_landmarker.task')),
                    running_mode=vision.RunningMode.VIDEO, num_hands=2,
                    min_hand_detection_confidence=.4, min_hand_presence_confidence=.4,
                    min_tracking_confidence=.4)))
        except BaseException:
            self.close()
            raise

    @property
    def metadata(self):
        return dict(mediapipe_version=importlib.metadata.version('mediapipe'),
                    model_hashes=MODEL_HASHES, running_mode='VIDEO', mirrored=False,
                    handedness='detector-native-unmirrored', hand_confidence=.4, pose_confidence=.5,
                    smoothing='mediapipe-only', missing_hand='zero', ambiguous_hand='zero')

    def extract_raw(self, rgb_frame, timestamp_ms):
        if isinstance(timestamp_ms, bool) or not isinstance(timestamp_ms, int) or timestamp_ms <= self._last_timestamp:
            raise ValueError('Timestamps must be strictly increasing integer milliseconds')
        self._last_timestamp = timestamp_ms
        image = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=rgb_frame)
        raw = from_mediapipe(self.pose.detect_for_video(image, timestamp_ms),
                             self.hand.detect_for_video(image, timestamp_ms))
        return raw

    def extract(self, rgb_frame, timestamp_ms):
        return normalize_keypoints(self.extract_raw(rgb_frame, timestamp_ms))

    def close(self):
        self._stack.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def main():
    import argparse
    import cv2
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--camera', type=int, default=0)
    args = parser.parse_args()
    cap = cv2.VideoCapture(args.camera)
    try:
        if not cap.isOpened():
            raise RuntimeError('Camera could not be opened')
        with LandmarkExtractor() as extractor:
            previous = -66
            while True:
                ok, frame = cap.read()
                if not ok:
                    raise RuntimeError('Camera frame unavailable')
                timestamp = time.monotonic_ns() // 1_000_000
                if timestamp - previous >= 66:
                    features = extractor.extract(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), timestamp)
                    previous = timestamp
                    print(f'features={features.shape}, pose_present={bool(features[:132].any())}')
                cv2.imshow('Sanket landmarks — Q to exit', frame)
                if cv2.waitKey(1) & 0xff == ord('q'):
                    break
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == '__main__':
    main()
