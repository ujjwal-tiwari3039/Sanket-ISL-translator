"""Re-extract labeled source videos through the canonical VIDEO-mode pipeline."""
import argparse
import hashlib
from pathlib import Path
from ml.src.preprocessing.keypoint_extractor import LandmarkExtractor
from .dataset import save_sample


def process_video(video_path, label, output, *, source='include', signer_id=None):
    import cv2
    path = Path(video_path)
    cap = cv2.VideoCapture(str(path))
    frames, timestamps = [], []
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not cap.isOpened() or not (0 < fps < 1000):
            raise ValueError(f'Cannot decode video/fps: {path}')
        with LandmarkExtractor() as extractor:
            index = 0
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                timestamp = round(index * 1000 / fps)
                index += 1
                if timestamps and timestamp - timestamps[-1] < 66:
                    continue
                frames.append(extractor.extract(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), timestamp))
                timestamps.append(timestamp)
            if len(frames) < 20:
                raise ValueError(f'Too short: {path} has {len(frames)} sampled frames; need 20')
            return save_sample(output, frames, label=label, source=source,
                               recording_id=hashlib.sha256(path.read_bytes()).hexdigest(),
                               signer_id=signer_id, extraction=extractor.metadata, timestamps_ms=timestamps)
    finally:
        cap.release()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--videos', type=Path, required=True, help='Directory with class subdirectories')
    parser.add_argument('--output', type=Path, default=Path('data/include'))
    parser.add_argument('--signer-id', help='Use only when all input clips share this known signer')
    parser.add_argument('--source', default='include')
    args = parser.parse_args()
    videos = sorted(p for p in args.videos.rglob('*') if p.suffix.lower() in ('.mov', '.mp4', '.webm'))
    if not videos:
        parser.error('No videos found')
    for video in videos:
        label = video.parent.name.split('. ', 1)[-1].strip().lower()
        print(process_video(video, label, args.output, source=args.source, signer_id=args.signer_id))


if __name__ == '__main__':
    main()
