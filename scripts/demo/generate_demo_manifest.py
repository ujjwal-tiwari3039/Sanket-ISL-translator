"""Generate a measured motion-segmented manifest, separate from scripted demos.

The legacy centroid-motion boundaries remain experimental. Features and resampling
come from the canonical pipeline; this is not live evaluation evidence.
"""
import argparse
import json
from pathlib import Path
import sys
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from ml.src.preprocessing import normalize_keypoints
from ml.src.preprocessing.keypoint_extractor import LandmarkExtractor
from ml.src.inference.realtime_inference import predict


def hand_centers(raw):
    return [block.reshape(21,3)[:,:2].mean(axis=0) for block in (raw[132:195],raw[195:258]) if np.any(block)]


def main():
    import cv2
    from tensorflow.keras.models import load_model
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--videos',type=Path,default=Path('apps/frontend/public/demo/videos'))
    parser.add_argument('--output',type=Path,required=True,help='New manifest path; does not overwrite scripted output')
    args=parser.parse_args()
    model=load_model('models/training/action.h5',compile=False)
    mapping=json.loads(Path('models/labels.json').read_text());labels=[mapping[str(i)] for i in range(len(mapping))]
    manifest=[]
    for video in sorted(args.videos.iterdir()):
        if video.suffix.lower() not in ('.mov','.mp4'):continue
        cap=cv2.VideoCapture(str(video));words=[];buffer=[];previous=[];low=0;index=0;last=-66
        try:
            fps=cap.get(cv2.CAP_PROP_FPS)
            if not 0<fps<1000:raise ValueError(f'Invalid fps: {video}')
            with LandmarkExtractor() as extractor:
                while True:
                    ok,frame=cap.read()
                    if not ok:break
                    timestamp=round(index*1000/fps);index+=1
                    if timestamp-last<66:continue
                    last=timestamp
                    raw=extractor.extract_raw(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB),timestamp)
                    features=normalize_keypoints(raw);centers=hand_centers(raw)
                    velocity=max((min(np.linalg.norm(c-p) for p in previous) for c in centers),default=0) if previous else 0
                    previous=centers
                    if not buffer:
                        if centers and velocity>.038:buffer=[features];low=0
                    else:
                        buffer.append(features);low=low+1 if velocity<.018 else 0
                        if low>=15 or len(buffer)>=60:
                            if len(buffer)>=20:
                                label,score=predict(model,labels,buffer,.7)
                                if label:words.append(dict(word=label,timestamp=timestamp/1000,confidence=score))
                            buffer=[]
                if len(buffer)>=20:
                    label,score=predict(model,labels,buffer,.7)
                    if label:words.append(dict(word=label,timestamp=last/1000,confidence=score))
            manifest.append(dict(video=video.name,origin='experimental-motion-model',words=words,sentence=''))
        finally:cap.release()
    with args.output.open('x') as stream:json.dump(manifest,stream,indent=2)


if __name__=='__main__':main()
