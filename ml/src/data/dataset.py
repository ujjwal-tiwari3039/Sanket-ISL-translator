"""Versioned NPZ sample format used by collection, extraction and training."""
from pathlib import Path
import hashlib
import json
import re
import uuid
import numpy as np
from ml.src.preprocessing import resample_sequence, validate_sequence
from ml.src.preprocessing.landmark_schema import (SCHEMA_VERSION, PREPROCESSING_VERSION, SEQUENCE_VERSION, EXTRACTION_PROFILE)

FORMAT_VERSION = 'sanket-sample-v1'
LABEL_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _'()-]{0,79}$")


def feature_hash(features):
    return hashlib.sha256(np.asarray(features, dtype='<f4').tobytes()).hexdigest()


def validate_label(label):
    if not isinstance(label, str) or label != label.strip() or not LABEL_PATTERN.fullmatch(label):
        raise ValueError(f'Invalid sign label: {label!r}')
    return label


def validate_metadata(metadata, features):
    expected = dict(format_version=FORMAT_VERSION, schema_version=SCHEMA_VERSION,
                    preprocessing_version=PREPROCESSING_VERSION, sequence_version=SEQUENCE_VERSION,
                    representation='normalized', feature_dim=258, frame_count=30, dtype='float32')
    for key, value in expected.items():
        if metadata.get(key) != value:
            raise ValueError(f'Incompatible {key}: {metadata.get(key)!r}')
    validate_label(metadata.get('label'))
    if ((features[:,3:132:4] < 0) | (features[:,3:132:4] > 1)).any():
        raise ValueError('Pose visibility outside [0,1]')
    for key in ('sample_id', 'source', 'recording_id'):
        if not isinstance(metadata.get(key), str) or not metadata[key].strip():
            raise ValueError(f'Missing {key}')
    if metadata.get('signer_id') is not None and not isinstance(metadata['signer_id'], str):
        raise ValueError('signer_id must be a string or null (unknown)')
    if not isinstance(metadata.get('extraction'), dict) or not metadata['extraction']:
        raise ValueError('Missing extraction provenance')
    if metadata['extraction'].get('provenance') != 'legacy-unknown' and metadata['extraction'] != EXTRACTION_PROFILE:
        raise ValueError('Unsupported extraction profile; re-extract or explicitly mark legacy provenance unknown')
    if metadata.get('features_sha256') != feature_hash(features):
        raise ValueError('Feature checksum mismatch')
    times = metadata.get('input_timestamps_ms')
    count = metadata.get('input_frame_count')
    if not isinstance(count, int) or count < 2:
        raise ValueError('Invalid input frame count')
    if times is not None:
        if len(times) != count or not all(isinstance(t, (int, float)) and np.isfinite(t) for t in times):
            raise ValueError('Invalid capture timestamps')
        if not all(a < b for a, b in zip(times, times[1:])):
            raise ValueError('Capture timestamps must increase')
    return metadata


def save_sample(output, frames, *, label, source, recording_id, extraction,
                signer_id=None, timestamps_ms=None):
    """Save one atomic, non-overwriting sample. No second normalization here."""
    label = validate_label(label).lower()
    features = resample_sequence(frames)
    if not features[:, :132].any() or (label != 'idle' and not features[:, 132:].any()):
        raise ValueError('Reject sample without pose or hand observations')
    sample_id = uuid.uuid4().hex
    metadata = dict(format_version=FORMAT_VERSION, schema_version=SCHEMA_VERSION,
                    preprocessing_version=PREPROCESSING_VERSION, sequence_version=SEQUENCE_VERSION,
                    representation='normalized', feature_dim=258, frame_count=30, dtype='float32',
                    sample_id=sample_id, label=label, source=source, recording_id=recording_id,
                    signer_id=signer_id, extraction=extraction, input_frame_count=len(frames),
                    input_timestamps_ms=timestamps_ms, features_sha256=feature_hash(features))
    validate_metadata(metadata, features)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    target = output / f'{sample_id}.npz'
    temporary = output / f'.{sample_id}.tmp'
    try:
        with temporary.open('xb') as stream:
            np.savez_compressed(stream, features=features, metadata=json.dumps(metadata, sort_keys=True))
        temporary.rename(target)
    finally:
        temporary.unlink(missing_ok=True)
    return target


def load_sample(path):
    with np.load(path, allow_pickle=False) as sample:
        if set(sample.files) != {'features', 'metadata'}:
            raise ValueError('Expected features and metadata only')
        features = validate_sequence(sample['features'])
        if features.dtype != np.dtype('float32'):
            raise ValueError('Canonical features must be float32')
        metadata = json.loads(str(sample['metadata'].item()))
    return features, validate_metadata(metadata, features)


def load_dataset(roots, *, allow_legacy=False):
    rows = []
    seen_ids = set()
    profiles = set()
    for root in roots:
        for path in sorted(Path(root).rglob('*.npz')):
            features, metadata = load_sample(path)
            if metadata['sample_id'] in seen_ids:
                raise ValueError(f'Duplicate sample id: {path}')
            seen_ids.add(metadata['sample_id'])
            legacy = metadata['extraction'].get('provenance') == 'legacy-unknown'
            if legacy and not allow_legacy:
                raise ValueError('Legacy provenance requires explicit --allow-legacy; it is not verified extraction')
            profiles.add(json.dumps(metadata['extraction'], sort_keys=True))
            rows.append((features, metadata, str(path)))
    if not rows:
        raise ValueError('No canonical NPZ samples found')
    if len(profiles) > 1:
        raise ValueError('Incompatible extraction profiles: re-extract into one profile before mixing')
    return sorted(rows, key=lambda row: (row[1]['source'], row[1]['recording_id'], row[1]['label'], row[1]['features_sha256']))
