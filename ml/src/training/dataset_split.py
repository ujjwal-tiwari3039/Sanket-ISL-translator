"""Split original recordings before augmentation, preserving signer/duplicate groups."""
from collections import Counter
import numpy as np
from ml.src.data.dataset import feature_hash


def split_records(rows, seed=42):
    parent = list(range(len(rows)))
    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    seen = {}
    hash_labels = {}
    for i, (features, metadata, _) in enumerate(rows):
        digest = feature_hash(features)
        if digest in hash_labels and hash_labels[digest] != metadata['label']:
            raise ValueError('Duplicate features have conflicting labels')
        hash_labels[digest] = metadata['label']
        keys = [('recording', metadata['recording_id']), ('features', digest)]
        if metadata['signer_id']:
            keys.append(('signer', metadata['signer_id']))
        for key in keys:
            if key in seen:
                parent[root(i)] = root(seen[key])
            seen[key] = i
    groups = {}
    for i in range(len(rows)):
        groups.setdefault(root(i), []).append(i)
    if len(groups) < 3:
        raise ValueError('Need at least three independent recording/signer groups')
    rng = np.random.default_rng(seed)
    group_list = list(groups.values())
    all_labels = {r[1]['label'] for r in rows}
    # Retry only to ensure train class coverage; no model/metric-based split selection.
    for _ in range(200):
        order = rng.permutation(len(group_list))
        count = max(1, round(len(order) * .15))
        if len(order) - 2 * count < 1:
            count = 1
        parts = [order[2*count:], order[:count], order[count:2*count]]
        split = {name: [i for g in indices for i in group_list[g]]
                 for name, indices in zip(('train', 'validation', 'test'), parts)}
        if {rows[i][1]['label'] for i in split['train']} == all_labels:
            return split
    raise ValueError('Cannot split groups with every class represented in training; collect more independent data')


def augment_training(features, seed=42):
    """Small coordinate jitter only. Preserve visibility and absent groups exactly."""
    rng = np.random.default_rng(seed)
    result = np.array(features, dtype=np.float32, copy=True)
    mask = result != 0
    mask[:, :, 3:132:4] = False
    noise = rng.normal(0, .005, result.shape)
    result[mask] += noise[mask]
    return result


def sample_weights(metadata, include_weight=1., custom_weight=1.):
    if not np.isfinite([include_weight, custom_weight]).all() or min(include_weight, custom_weight) <= 0:
        raise ValueError('Source weights must be finite and positive')
    counts = Counter((m['label'], m['source']) for m in metadata)
    sources_per_label = Counter(label for label, source in counts)
    weights = np.array([dict(include=include_weight, custom=custom_weight).get(m['source'], 1.) /
                       (counts[m['label'], m['source']] * sources_per_label[m['label']]) for m in metadata])
    return weights / weights.mean()
