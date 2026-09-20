import cv2
import numpy as np
import os
import glob
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from phase1_5_data_collection import extract_keypoints, pose_landmarker, hand_landmarker, face_landmarker

DATA_PATH = os.path.join('MP_Data')
INCLUDE_PATH = os.path.join('islmodel', 'ProcessedData_vivit')
SEQUENCE_LENGTH = 30

def process_video(video_path, word, seq_num):
    cap = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret: break
        frames.append(frame)
    cap.release()
    
    if len(frames) == 0:
        return False
        
    out_dir = os.path.join(DATA_PATH, word, str(seq_num))
    os.makedirs(out_dir, exist_ok=True)
    
    # Select exactly SEQUENCE_LENGTH frames
    # Simple strategy: linearly space indices
    indices = np.linspace(0, len(frames)-1, SEQUENCE_LENGTH, dtype=int)
    
    for i, idx in enumerate(indices):
        frame = frames[idx]
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        pose_result = pose_landmarker.detect(mp_image)
        hand_result = hand_landmarker.detect(mp_image)
        face_result = face_landmarker.detect(mp_image)
        
        keypoints = extract_keypoints(pose_result, hand_result, face_result)
        npy_path = os.path.join(out_dir, f"{i}.npy")
        np.save(npy_path, keypoints)
        
    return True

def main():
    words = os.listdir(INCLUDE_PATH)
    total_processed = 0
    for word in words:
        word_path = os.path.join(INCLUDE_PATH, word)
        if not os.path.isdir(word_path): continue
        
        videos = glob.glob(os.path.join(word_path, '*.MOV')) + glob.glob(os.path.join(word_path, '*.mp4'))
        videos.sort()
        
        # Determine starting sequence number for this word in MP_Data
        word_out_path = os.path.join(DATA_PATH, word)
        seq_num = 0
        if os.path.exists(word_out_path):
            existing_seqs = [int(s) for s in os.listdir(word_out_path) if s.isdigit()]
            if existing_seqs:
                seq_num = max(existing_seqs) + 1
                
        for video in videos:
            print(f"Processing {word} - {video} -> seq {seq_num}")
            if process_video(video, word, seq_num):
                seq_num += 1
                total_processed += 1
                
    print(f"Total videos processed: {total_processed}")

if __name__ == '__main__':
    main()
