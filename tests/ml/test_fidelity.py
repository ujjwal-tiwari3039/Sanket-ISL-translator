"""Actual shipped Keras/TFJS prediction parity, not a stale raw-input demo."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import numpy as np
from ml.src.preprocessing import build_raw_features,normalize_keypoints,resample_sequence

ROOT=Path(__file__).resolve().parents[2]


class ModelParityTests(unittest.TestCase):
    def test_new_export_predictions(self):
        from tensorflow.keras.models import load_model
        from ml.src.training.train_lstm import export_tfjs
        model=load_model(ROOT/'models/training/action.h5',compile=False)
        mapping=json.loads((ROOT/'models/labels.json').read_text())
        features=np.random.default_rng(42).normal(0,.1,(1,30,258)).astype(np.float32)
        expected=np.asarray(model(features,training=False)).ravel()
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)/'tfjs'
            export_tfjs(model,[mapping[str(i)] for i in range(len(mapping))],output)
            actual=json.loads(subprocess.check_output(['node','tests/frontend/model-parity.mjs',str(output)],cwd=ROOT,input=json.dumps(features.tolist()).encode()))
        np.testing.assert_allclose(expected,actual,atol=1e-5,rtol=1e-4)

    def test_shipped_predictions_labels_and_shapes(self):
        from tensorflow.keras.models import load_model
        fixture=json.loads((ROOT/'tests/fixtures/landmarks.json').read_text())
        features=resample_sequence([normalize_keypoints(build_raw_features(f['pose'],f['hands'])) for f in fixture['frames']])[None]
        model=load_model(ROOT/'models/training/action.h5',compile=False)
        labels=json.loads((ROOT/'models/labels.json').read_text())
        self.assertEqual(labels,json.loads((ROOT/'apps/frontend/public/models/labels.json').read_text()))
        self.assertEqual(model.input_shape,(None,30,258));self.assertEqual(model.output_shape[-1],len(labels))
        scores=np.asarray(model(features,training=False)).ravel()
        js=json.loads(subprocess.check_output(['node','tests/frontend/model-parity.mjs'],cwd=ROOT,input=json.dumps(features.tolist()).encode()))
        np.testing.assert_allclose(scores,js,atol=1e-5,rtol=1e-4)


if __name__=='__main__':unittest.main()
