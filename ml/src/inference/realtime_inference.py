"""Python diagnostic capture using the same 258-feature pipeline as the browser."""
import argparse
from collections import deque
import json
from pathlib import Path
import time
import urllib.request
import numpy as np
from ml.src.preprocessing import resample_sequence
from ml.src.preprocessing.keypoint_extractor import LandmarkExtractor, ROOT


def predict(model, labels, frames, confidence=.4):
    if len(frames) < 20:
        raise ValueError('Capture at least 20 frames')
    sequence = resample_sequence(frames)
    scores = np.asarray(model(sequence[None], training=False))[0]
    if scores.shape != (len(labels),) or not np.isfinite(scores).all():
        raise ValueError('Invalid model output')
    index = int(scores.argmax()); label = labels[index]
    return label if scores[index] > confidence and label not in ('idle','extra','unknown') else None, float(scores[index])


def main():
    import cv2
    from tensorflow.keras.models import load_model
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--camera',type=int,default=0)
    parser.add_argument('--confidence',type=float,default=.4)
    args = parser.parse_args()
    if not 0 <= args.confidence <= 1: parser.error('confidence must be in [0,1]')
    model = load_model(ROOT/'models/training/action.h5',compile=False)
    label_map = json.loads((ROOT/'models/labels.json').read_text())
    labels = [label_map[str(i)] for i in range(len(label_map))]
    if tuple(model.input_shape[1:]) != (30,258) or model.output_shape[-1] != len(labels):
        raise ValueError('Model/labels shape mismatch')
    cap = cv2.VideoCapture(args.camera)
    sentence, frames = [], []
    recording = False; previous = -66; status = 'R: start/stop sign; T: translate; Q: quit'
    try:
        if not cap.isOpened(): raise RuntimeError('Camera unavailable')
        with LandmarkExtractor() as extractor:
            while True:
                ok, image = cap.read()
                if not ok: raise RuntimeError('Camera disconnected')
                timestamp = time.monotonic_ns()//1_000_000
                if timestamp-previous >= 66:
                    features=extractor.extract(cv2.cvtColor(image,cv2.COLOR_BGR2RGB),timestamp)
                    previous=timestamp
                    if recording: frames.append(features)
                cv2.putText(image,status,(10,30),cv2.FONT_HERSHEY_SIMPLEX,.6,(0,255,0),2)
                cv2.imshow('Sanket diagnostic capture',image)
                key=cv2.waitKey(1)&0xff
                if key==ord('q'):break
                if key==ord('r') or (recording and len(frames)>=300):
                    if not recording:frames=[];recording=True;status='Recording: R to stop'
                    else:
                        recording=False
                        try:
                            label,score=predict(model,labels,frames,args.confidence)
                            if label:sentence.append(label)
                            status=f'{label or "Uncertain"}: {score:.2f}. R: next sign; T: translate'
                        except ValueError as e:status=str(e)
                if key==ord('t') and sentence:
                    try:
                        request=urllib.request.Request('http://127.0.0.1:3001/api/assemble',data=json.dumps({'sequence':sentence}).encode(),headers={'Content-Type':'application/json'})
                        with urllib.request.urlopen(request,timeout=25) as response: print(response.read().decode())
                        sentence=[]
                    except OSError:print('Sentence service unavailable; context retained:',sentence)
    finally:
        cap.release();cv2.destroyAllWindows()


if __name__=='__main__':main()
