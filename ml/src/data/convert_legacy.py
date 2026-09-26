"""Explicitly convert legacy 1692 NPY windows; never invent extraction provenance."""
import argparse
from pathlib import Path
import hashlib
import numpy as np
from ml.src.preprocessing import convert_legacy_frame
from .dataset import save_sample


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('data/processed/legacy'))
    parser.add_argument('--acknowledge-unknown-provenance', action='store_true', required=True)
    parser.add_argument('--max-classes', type=int, default=None, help='Optional engineering smoke subset')
    parser.add_argument('--max-samples-per-class', type=int, default=None)
    args = parser.parse_args()
    if any(value is not None and value < 1 for value in (args.max_classes, args.max_samples_per_class)):
        parser.error('Subset limits must be positive')
    written = rejected = 0
    for label in sorted(p for p in args.input.iterdir() if p.is_dir())[:args.max_classes]:
        if not label.is_dir():
            continue
        for sequence in sorted(p for p in label.iterdir() if p.is_dir() and p.name.isdigit())[:args.max_samples_per_class]:
            if not sequence.is_dir() or not sequence.name.isdigit():
                continue
            try:
                paths = [sequence / f'{i}.npy' for i in range(30)]
                raw = [np.load(p, allow_pickle=False) for p in paths]
                frames = [convert_legacy_frame(frame) for frame in raw]
                recording_id = hashlib.sha256(b''.join(p.read_bytes() for p in paths)).hexdigest()
                save_sample(args.output, frames, label=label.name.split('. ', 1)[-1].strip().lower(),
                    source='legacy', recording_id=recording_id,
                    extraction=dict(provenance='legacy-unknown', mirrored='unknown',
                                    mediapipe_version='unknown', sampling='legacy-30-unknown'))
                written += 1
            except (ValueError, OSError) as error:
                rejected += 1
                print(f'Rejected {sequence}: {error}')
    print(f'Converted {written}; rejected {rejected}. Provenance remains unknown.')
    if rejected:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
