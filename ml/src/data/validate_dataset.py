"""Validate canonical datasets or audit legacy NPYs without asserting provenance."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import zipfile
from pathlib import Path
import numpy as np
from .dataset import load_sample, feature_hash, validate_label
from ml.src.preprocessing import convert_legacy_frame


def audit(roots, legacy=False):
    report = dict(format='sanket-dataset-report-v1', mode='legacy-audit' if legacy else 'canonical',
                  samples=0, classes={}, sources={}, signers={}, errors=[], warnings=[],
                  duplicates=[], missing_left_frames=0, missing_right_frames=0, missing_pose_frames=0,
                  anatomical_handedness='not verifiable without labeled source imagery')
    classes, sources, signers = Counter(), Counter(), Counter()
    hashes = defaultdict(list)
    profiles = set()
    for root in roots:
        paths = sorted(Path(root).glob('*/*')) if legacy else sorted(Path(root).rglob('*.npz'))
        for path in paths:
            if legacy and (not path.is_dir() or not path.name.isdigit()):
                continue
            try:
                if legacy:
                    raw = np.stack([np.load(path / f'{i}.npy', allow_pickle=False) for i in range(30)])
                    if len(list(path.glob('*.npy'))) != 30:
                        raise ValueError('Expected exactly 30 NPY frames')
                    features = np.stack([convert_legacy_frame(f) for f in raw])
                    metadata = dict(label=path.parent.name.split('. ', 1)[-1].strip().lower(), source='legacy', signer_id=None)
                    visibility = raw[:, 3:132:4]
                else:
                    features, metadata = load_sample(path)
                    profiles.add(json.dumps(metadata['extraction'], sort_keys=True))
                    visibility = features[:, 3:132:4]
                validate_label(metadata['label'])
                if ((visibility < 0) | (visibility > 1)).any():
                    raise ValueError('Pose visibility outside [0,1]')
                # Normalized XY are not constrained to [0,1]. Wide envelope flags suspect units.
                if np.max(np.abs(features)) > 100:
                    report['warnings'].append(dict(path=str(path), warning='Feature magnitude >100; inspect units/anchors'))
                for key, start, end in [('missing_pose_frames',0,132), ('missing_left_frames',132,195), ('missing_right_frames',195,258)]:
                    report[key] += int(np.sum(~np.any(features[:, start:end], axis=1)))
                report['samples'] += 1
                classes[metadata['label']] += 1
                sources[metadata['source']] += 1
                signers[metadata['signer_id'] or 'unknown'] += 1
                hashes[feature_hash(features)].append(dict(path=str(path), label=metadata['label']))
            except (ValueError, OSError, KeyError, TypeError, EOFError, zipfile.BadZipFile) as error:
                report['errors'].append(dict(path=str(path), error=str(error)))
    report.update(classes=dict(classes), sources=dict(sources), signers=dict(signers))
    report['duplicates'] = [rows for rows in hashes.values() if len(rows) > 1]
    for group in report['duplicates']:
        if len({row['label'] for row in group}) > 1:
            report['errors'].append(dict(error='Identical features have conflicting labels', samples=group))
    if len(profiles) > 1:
        report['errors'].append(dict(error='Multiple extraction profiles; do not mix silently'))
    if legacy:
        report['warnings'].append(dict(warning='Extraction version, mirroring, source and signer provenance unknown'))
    if not report['samples']:
        report['errors'].append(dict(error='No valid samples'))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('roots', nargs='+', type=Path)
    parser.add_argument('--legacy', action='store_true')
    parser.add_argument('--output', type=Path, default=Path('models/evaluation/dataset_report.json'))
    args = parser.parse_args()
    report = audit(args.roots, args.legacy)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(f"{report['samples']} samples; {len(report['classes'])} classes; {len(report['errors'])} errors; {len(report['duplicates'])} duplicate groups")
    raise SystemExit(bool(report['errors']))


if __name__ == '__main__':
    main()
