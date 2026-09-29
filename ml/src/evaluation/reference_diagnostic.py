"""Re-extract identified diagnostic videos; never train or promote weights."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np

from ml.src.data.dataset import load_sample
from ml.src.data.process_include import process_video


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--videos', type=Path, required=True)
    parser.add_argument('--label', required=True)
    parser.add_argument('--source', required=True)
    parser.add_argument('--samples', type=Path,
                        default=Path('data/processed/reference-diagnostic'),
                        help='Canonical diagnostic samples, separate from reports')
    parser.add_argument('--output', type=Path, required=True,
                        help='New diagnostic directory; must not exist')
    parser.add_argument('--model', type=Path, default=Path('models/training/action.h5'))
    parser.add_argument('--labels', type=Path, default=Path('models/labels.json'))
    args = parser.parse_args()
    videos = sorted(p for p in args.videos.iterdir()
                    if p.suffix.lower() in {'.mov', '.mp4', '.webm'})
    if not videos or args.output.exists():
        parser.error('Need source videos and a new output directory')
    mapping = json.loads(args.labels.read_text())
    labels = [mapping[str(i)] for i in range(len(mapping))]
    if args.label not in labels or len(set(labels)) != len(labels):
        parser.error('Invalid target or duplicate labels')
    import tensorflow as tf
    model = tf.keras.models.load_model(args.model, compile=False)
    if tuple(model.input_shape[1:]) != (30, 258) or model.output_shape[-1] != len(labels):
        raise ValueError('Model/schema/label shape mismatch')
    args.output.mkdir(parents=True)
    rows = []
    for video in videos:
        sample = process_video(video, args.label, args.samples, source=args.source)
        features, metadata = load_sample(sample)
        scores = model(features[None], training=False).numpy()[0]
        if not np.isfinite(scores).all():
            raise ValueError('Nonfinite model output')
        order = np.argsort(-scores)
        rows.append(dict(video=str(video), sample=str(sample),
                         recording_sha256=metadata['recording_id'],
                         input_frames=metadata['input_frame_count'],
                         shape=list(features.shape), scores=scores.tolist(),
                         top3=[dict(label=labels[i], score=float(scores[i])) for i in order[:3]]))
        print(video.name, rows[-1]['top3'], flush=True)
    report = dict(scope='Source-identified reconstruction diagnostic; not held-out evaluation',
                  model_sha256=hashlib.sha256(args.model.read_bytes()).hexdigest(),
                  labels=labels, label=args.label, source=args.source, results=rows)
    (args.output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
