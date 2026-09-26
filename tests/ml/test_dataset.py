import copy
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
from ml.src.preprocessing import build_raw_features, normalize_keypoints
from ml.src.data.dataset import save_sample, load_sample, load_dataset, validate_label
from ml.src.data.validate_dataset import audit
from ml.src.training.dataset_split import split_records, augment_training, sample_weights
from ml.src.preprocessing.landmark_schema import EXTRACTION_PROFILE

FIXTURE = json.loads((Path(__file__).resolve().parents[1]/'fixtures/landmarks.json').read_text())


class DatasetTests(unittest.TestCase):
    def test_shipped_vocabulary_remains_valid(self):
        labels=json.loads((Path(__file__).resolve().parents[2]/'models/labels.json').read_text())
        for label in labels.values(): self.assertEqual(validate_label(label),label)

    def frames(self):
        return [normalize_keypoints(build_raw_features(f['pose'],f['hands'])) for f in FIXTURE['frames']]

    def test_roundtrip_metadata_and_incompatibility(self):
        with tempfile.TemporaryDirectory() as root:
            path = save_sample(root,self.frames(),label='hello',source='custom',recording_id='r1',
                               extraction=EXTRACTION_PROFILE,timestamps_ms=[0,66,132,198])
            features,metadata = load_sample(path)
            self.assertEqual(features.shape,(30,258)); self.assertEqual(metadata['signer_id'],None)
            self.assertEqual(len(load_dataset([root])),1)
            self.assertEqual(audit([root])['errors'],[])
            with self.assertRaises(ValueError):
                save_sample(root,self.frames(),label='hello',source='include',recording_id='r2',extraction={'version':'other'})
            save_sample(root,self.frames(),label='hello',source='legacy',recording_id='r2',extraction={'provenance':'legacy-unknown'})
            with self.assertRaises(ValueError):load_dataset([root])
            with self.assertRaises(ValueError):load_dataset([root],allow_legacy=True)

    def test_legacy_requires_explicit_choice_and_cannot_mix(self):
        with tempfile.TemporaryDirectory() as root:
            save_sample(root,self.frames(),label='hello',source='legacy',recording_id='r1',extraction={'provenance':'legacy-unknown'})
            with self.assertRaises(ValueError):load_dataset([root])
            self.assertEqual(len(load_dataset([root],allow_legacy=True)),1)

    def test_invalid_samples_reject(self):
        with tempfile.TemporaryDirectory() as root:
            for label in ['../bad','',' hello']:
                with self.assertRaises(ValueError):
                    save_sample(root,self.frames(),label=label,source='custom',recording_id='x',extraction={'v':1})
            with self.assertRaises(ValueError):
                save_sample(root,np.zeros((30,258)),label='hello',source='custom',recording_id='x',extraction={'v':1})
            with self.assertRaises(ValueError):
                save_sample(root,self.frames(),label='hello',source='custom',recording_id='x',extraction={'v':1},timestamps_ms=[1,2,2,3])

    def rows(self):
        rows=[]
        for i in range(30):
            f=np.ones((30,258),dtype=np.float32)*(i+1)
            rows.append((f,dict(label=['hello','bye'][i%2],source='custom',recording_id=f'r{i}',signer_id=f's{i//2}'),str(i)))
        return rows

    def test_splits_group_signers_recordings_duplicates_and_are_reproducible(self):
        rows=self.rows();rows.append(copy.deepcopy(rows[0]));rows[-1][1]['recording_id']='duplicate'
        split=split_records(rows);self.assertEqual(split,split_records(rows))
        groups=[]
        for ids in split.values():groups.append({rows[i][1]['signer_id'] for i in ids})
        self.assertFalse(groups[0]&groups[1] or groups[0]&groups[2] or groups[1]&groups[2])
        self.assertTrue(any(0 in ids and 30 in ids for ids in split.values()))
        self.assertEqual(sum(map(len,split.values())),len(rows))

    def test_augmentation_preserves_visibility_and_absence(self):
        features=np.stack([np.stack(self.frames())])
        augmented=augment_training(features)
        np.testing.assert_array_equal(features[:,:,3:132:4],augmented[:,:,3:132:4])
        self.assertFalse(augmented[features==0].any())
        self.assertFalse(np.array_equal(features,augmented))

    def test_source_weighting_uses_group_totals(self):
        meta=[dict(label='hello',source='include')]*20+[dict(label='hello',source='custom')]*2
        weights=sample_weights(meta)
        self.assertAlmostEqual(weights[:20].sum(),weights[20:].sum())
        with self.assertRaises(ValueError):sample_weights(meta,custom_weight=0)


if __name__=='__main__':unittest.main()
