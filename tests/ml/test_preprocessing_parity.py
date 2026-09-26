import copy
import json
from pathlib import Path
import subprocess
import unittest
import numpy as np
from ml.src.preprocessing import (build_raw_features, normalize_keypoints,
    convert_legacy_frame, resample_sequence, validate_frame, validate_sequence)

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = json.loads((ROOT / 'tests/fixtures/landmarks.json').read_text())


class PreprocessingTests(unittest.TestCase):
    def test_python_browser_parity(self):
        frames = copy.deepcopy(FIXTURE['frames'])
        # Degenerate shoulders and conflicting detector labels are parity cases too.
        extra = copy.deepcopy(frames[0]); extra['pose'][12] = extra['pose'][11].copy()
        frames.append(extra)
        extra = copy.deepcopy(frames[0]); extra['hands'] = extra['hands'][:1] * 2
        frames.append(extra)
        js = json.loads(subprocess.check_output(
            ['node', 'tests/frontend/preprocessing-parity.mjs'], cwd=ROOT,
            input=json.dumps({'frames': frames}).encode()))
        raw = [build_raw_features(f['pose'], f['hands']) for f in frames]
        normalized = [normalize_keypoints(f) for f in raw]
        for name, python in [('raw', raw), ('normalized', normalized),
                             ('sequence', resample_sequence(normalized))]:
            np.testing.assert_allclose(python, js[name], rtol=1e-6, atol=1e-6, err_msg=name)

    def test_missing_pose_and_hand(self):
        f = FIXTURE['frames'][0]
        self.assertFalse(normalize_keypoints(build_raw_features(None, f['hands'])).any())
        raw = build_raw_features(f['pose'], [f['hands'][1]])
        self.assertFalse(raw[132:195].any())
        self.assertTrue(raw[195:].any())

    def test_handedness_order_and_ambiguity(self):
        f = FIXTURE['frames'][0]
        np.testing.assert_array_equal(build_raw_features(f['pose'], f['hands']),
                                      build_raw_features(f['pose'], f['hands'][::-1]))
        self.assertFalse(build_raw_features(f['pose'], [f['hands'][0]] * 2)[132:].any())
        self.assertFalse(build_raw_features(f['pose'], [dict(f['hands'][0], label='Unknown')])[132:].any())

    def test_normalization_and_legacy_conversion(self):
        f = FIXTURE['frames'][0]
        raw = build_raw_features(f['pose'], f['hands']); original = raw.copy()
        result = normalize_keypoints(raw)
        self.assertEqual(result.shape, (258,))
        self.assertEqual(result[0], 0); self.assertEqual(result[1], 0)
        self.assertAlmostEqual(float(result[132]), -1, places=6)
        np.testing.assert_array_equal(raw, original)
        np.testing.assert_array_equal(result[3:132:4], raw[3:132:4])
        np.testing.assert_array_equal(result[134::3], raw[134::3])
        legacy = np.concatenate([raw[:132], np.zeros(1434), raw[132:]])
        np.testing.assert_array_equal(convert_legacy_frame(legacy), result)

    def test_sequence_and_rejections(self):
        raw = [normalize_keypoints(build_raw_features(f['pose'], f['hands'])) for f in FIXTURE['frames']]
        result = resample_sequence(raw)
        self.assertEqual(validate_sequence(result).shape, (30, 258))
        np.testing.assert_array_equal(result[0], raw[0]); np.testing.assert_array_equal(result[-1], raw[-1])
        for bad in [[], [raw[0]], [[0] * 257] * 3]:
            with self.assertRaises(ValueError): resample_sequence(bad)
        for bad in [np.zeros(1692), np.full(258, np.nan), np.full(258, np.inf)]:
            with self.assertRaises(ValueError): validate_frame(bad)
        with self.assertRaises(ValueError): build_raw_features(FIXTURE['frames'][0]['pose'][:3])
        with self.assertRaises(ValueError): resample_sequence(raw, 1)


if __name__ == '__main__':
    unittest.main()
