import cv2
import os
import numpy as np
import hashlib
from pathlib import Path
from ml.src.preprocessing.keypoint_extractor import LandmarkExtractor
from ml.src.data.dataset import save_sample

# Put the paths to the short sentences here
video_paths = [
    "islmodel/ISL_CSLRT_Corpus/Videos_Sentence_Level/are you free today/are you free today.mp4",
    "islmodel/ISL_CSLRT_Corpus/Videos_Sentence_Level/go and sleep/go and sleep.mp4",
    "islmodel/ISL_CSLRT_Corpus/Videos_Sentence_Level/help me/help me.mp4"
]

DATA_PATH = 'data/custom'

def segment_video(video_path):
    print(f"\n--- Segmenting {video_path} ---")
    if not os.path.exists(video_path):
        print(f"Video {video_path} not found!")
        return
        
    sentence = os.path.basename(os.path.dirname(video_path))
    words = sentence.split(" ")
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not 0 < fps < 1000:
        cap.release(); raise ValueError("Invalid source fps")
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret: break
        frames.append(frame)
    cap.release()
    
    if not frames:
        print("No frames found.")
        return

    print(f"Sentence: '{sentence}' ({len(words)} words, {len(frames)} frames)")
    print("Instructions: We will play the video. Press 'SPACE' to mark the START of a word, and 'SPACE' again to mark the END.")
    
    for word in words:
        print(f"-> Now finding boundaries for the word: '{word.upper()}'")
        idx = 0
        start_frame = -1
        end_frame = -1
        
        while idx < len(frames):
            frame = frames[idx].copy()
            cv2.putText(frame, f"Word: {word.upper()}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            if start_frame == -1:
                cv2.putText(frame, "Press SPACE to set START frame", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            elif end_frame == -1:
                cv2.putText(frame, f"Start: {start_frame}. Press SPACE to set END frame", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            cv2.imshow("Segmenter", frame)
            
            key = cv2.waitKey(0) & 0xFF
            if key == ord(' '):
                if start_frame == -1:
                    start_frame = idx
                elif end_frame == -1:
                    end_frame = idx
                    break
            elif key == ord('n'): # next frame
                idx = min(idx + 1, len(frames) - 1)
            elif key == ord('p'): # prev frame
                idx = max(idx - 1, 0)
            elif key == ord('q'):
                cv2.destroyAllWindows()
                return
                
        print(f"Word '{word}' boundaries: {start_frame} to {end_frame}")
        
        if start_frame < 0 or end_frame <= start_frame:
            print('Rejected invalid boundaries'); continue
        features, timestamps = [], []
        with LandmarkExtractor() as extractor:
            for i in range(start_frame, end_frame + 1):
                timestamp = round(i * 1000 / fps)
                if timestamps and timestamp - timestamps[-1] < 66: continue
                features.append(extractor.extract(cv2.cvtColor(frames[i], cv2.COLOR_BGR2RGB), timestamp))
                timestamps.append(timestamp)
            if len(features) < 20:
                print('Rejected short segment; need 20 sampled frames'); continue
            # All word segments from one source video remain one split group.
            print(save_sample(DATA_PATH, features, label=word.lower(), source='custom',
                recording_id=hashlib.sha256(Path(video_path).read_bytes()).hexdigest(),
                extraction=extractor.metadata, timestamps_ms=timestamps))

    cv2.destroyAllWindows()

def main():
    for vp in video_paths:
        segment_video(vp)
        
if __name__ == '__main__':
    main()
