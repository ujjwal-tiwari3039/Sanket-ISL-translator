"""Collect labeled webcam gestures with canonical extraction and sample metadata."""
import argparse
import time
import uuid
from pathlib import Path
from ml.src.preprocessing.keypoint_extractor import LandmarkExtractor
from .dataset import save_sample, validate_label


def main():
    import cv2
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--camera', type=int, default=0)
    parser.add_argument('--label', required=True)
    parser.add_argument('--samples', type=int, default=15)
    parser.add_argument('--signer-id', help='Stable pseudonymous signer ID; omitted means unknown')
    parser.add_argument('--output', type=Path, default=Path('data/custom'))
    args = parser.parse_args()
    validate_label(args.label)
    if args.samples < 1:
        parser.error('--samples must be positive')
    cap = cv2.VideoCapture(args.camera)
    try:
        if not cap.isOpened():
            raise RuntimeError('Camera could not be opened')
        saved = 0
        frames, timestamps = [], []
        recording = False
        # Recreate detector on each new take so unrelated recordings share no tracking history.
        extractor = None
        try:
            while saved < args.samples:
                ok, image = cap.read()
                if not ok:
                    raise RuntimeError('Camera disconnected; unfinished take discarded')
                now = time.monotonic_ns() // 1_000_000
                if recording and (not timestamps or now - timestamps[-1] >= 66):
                    frames.append(extractor.extract(cv2.cvtColor(image, cv2.COLOR_BGR2RGB), now))
                    timestamps.append(now)
                display = cv2.flip(image, 1)  # Preview only. Detector input is unmirrored.
                text = f'{args.label} {saved}/{args.samples}: R start/stop, Q quit ({len(frames)} frames)'
                cv2.putText(display, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, .6, (0, 255, 0), 2)
                cv2.imshow('Sanket collection', display)
                key = cv2.waitKey(1) & 0xff
                if key == ord('q'):
                    break
                if key == ord('r'):
                    if not recording:
                        if extractor:
                            extractor.close()
                        extractor = LandmarkExtractor()
                        frames, timestamps = [], []
                        recording = True
                    else:
                        recording = False
                        if len(frames) < 20:
                            print('Rejected: capture at least 20 frames')
                            continue
                        try:
                            path = save_sample(args.output, frames, label=args.label, source='custom',
                                signer_id=args.signer_id, recording_id=uuid.uuid4().hex,
                                extraction=extractor.metadata, timestamps_ms=timestamps)
                            print(path)
                            saved += 1
                        except ValueError as error:
                            print(f'Rejected: {error}')
                if recording and len(frames) >= 300:
                    recording = False
                    print('Rejected: take exceeded 300 frames; record a single sign')
        finally:
            if extractor:
                extractor.close()
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == '__main__':
    main()
