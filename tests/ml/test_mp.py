"""Optional real-video extractor smoke check; unit discovery never opens a camera."""
import os
from pathlib import Path
import unittest


class MediaPipeTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get('SANKET_VIDEO_TEST'), 'Set SANKET_VIDEO_TEST to a readable sign video')
    def test_video_extraction(self):
        import tempfile
        from ml.src.data.process_include import process_video
        from ml.src.data.dataset import load_sample
        with tempfile.TemporaryDirectory() as output:
            path=process_video(Path(os.environ['SANKET_VIDEO_TEST']),'reference',output,source='test')
            features,metadata=load_sample(path)
            self.assertEqual(features.shape,(30,258))
            self.assertEqual(metadata['extraction']['mirrored'],False)


if __name__=='__main__':unittest.main()
