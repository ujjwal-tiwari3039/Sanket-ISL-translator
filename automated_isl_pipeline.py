import os
import time
import subprocess
import glob
import cv2
import numpy as np

# --- DEPENDENCY CHECK ---
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
except ImportError:
    print("Missing dependencies! Please run:")
    print("pip install mediapipe")
    exit()

# --- CONFIGURATION ---
# Extracted vocabulary from the NIOS Indian Sign Language 230 PDF
WORDS_TO_LEARN = [
    "sleep", "time", "late", "good", "easy", "sister", 
    "brother", "water", "walk", "teach", "apple", "snake", 
    "laptop", "tree", "hello", "thanks"
] 
SEQUENCE_LENGTH = 30
DATA_PATH = os.path.join("MP_Data")
RAW_VIDEO_DIR = "Raw_Videos"

# --- 1. SCRAPING MODULE ---
def download_video_from_youtube(word, output_path):
    print(f"    -> Searching YouTube for: Indian Sign Language {word}")
    search_query = f"ytsearch1:Indian Sign Language {word}"
    command = ["yt-dlp", "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best", "-o", output_path, search_query]
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return result.returncode == 0

def scrape_isl_videos(words):
    os.makedirs(RAW_VIDEO_DIR, exist_ok=True)
    print("\n--- Phase 1: Bypassing Cloudflare & Scraping Videos ---")
    
    for word in words:
        output_file = os.path.join(RAW_VIDEO_DIR, f"{word.lower()}.mp4")
        if os.path.exists(output_file):
            print(f"[{word}] Video already downloaded. Skipping.")
            continue
            
        success = download_video_from_youtube(word, output_file)
        if success:
            print(f"[{word}] Success! Downloaded video.")
        else:
            print(f"[{word}] Failed to find/download video.")

# --- 2. MEDIAPIPE KEYPOINT EXTRACTION MODULE ---
def setup_mediapipe():
    BaseOptions = mp.tasks.BaseOptions
    pose_options = vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path='models/pose_landmarker.task'))
    hand_options = vision.HandLandmarkerOptions(base_options=BaseOptions(model_asset_path='models/hand_landmarker.task'), num_hands=2)
    face_options = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path='models/face_landmarker.task'))
    
    return (
        vision.PoseLandmarker.create_from_options(pose_options),
        vision.HandLandmarker.create_from_options(hand_options),
        vision.FaceLandmarker.create_from_options(face_options)
    )

def extract_frame_keypoints(pose_result, hand_result, face_result):
    pose = np.zeros(33 * 4)
    if pose_result.pose_landmarks:
        pose = np.array([[res.x, res.y, res.z, res.visibility] for res in pose_result.pose_landmarks[0]]).flatten()
        
    face = np.zeros(478 * 3)
    if face_result.face_landmarks:
        face = np.array([[res.x, res.y, res.z] for res in face_result.face_landmarks[0]]).flatten()
        
    lh = np.zeros(21 * 3)
    rh = np.zeros(21 * 3)
    if hand_result.hand_landmarks:
        for idx, handedness in enumerate(hand_result.handedness):
            hand_type = handedness[0].category_name
            landmarks = np.array([[res.x, res.y, res.z] for res in hand_result.hand_landmarks[idx]]).flatten()
            if hand_type == 'Left': lh = landmarks
            elif hand_type == 'Right': rh = landmarks
                
    return np.concatenate([pose, face, lh, rh])

def process_videos_to_dataset(words, stride=5):
    print("\n--- Phase 2: Processing Videos to 30-Frame Sequences ---")
    pose_lm, hand_lm, face_lm = setup_mediapipe()
    
    for word in words:
        video_path = os.path.join(RAW_VIDEO_DIR, f"{word.lower()}.mp4")
        if not os.path.exists(video_path):
            continue
            
        print(f"[{word}] Extracting keypoints from video...")
        cap = cv2.VideoCapture(video_path)
        all_frames_keypoints = []
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            p_res = pose_lm.detect(mp_image)
            h_res = hand_lm.detect(mp_image)
            f_res = face_lm.detect(mp_image)
            
            all_frames_keypoints.append(extract_frame_keypoints(p_res, h_res, f_res))
            
        cap.release()
        
        if len(all_frames_keypoints) < SEQUENCE_LENGTH:
            print(f"    -> Video too short for {SEQUENCE_LENGTH} frames.")
            continue
        
        # Sliding window to create multiple 30-frame sequences from one video
        action_dir = os.path.join(DATA_PATH, word)
        os.makedirs(action_dir, exist_ok=True)
        
        existing_seqs = len(glob.glob(os.path.join(action_dir, "*")))
        
        sequences_created = 0
        for i in range(0, len(all_frames_keypoints) - SEQUENCE_LENGTH + 1, stride):
            window = all_frames_keypoints[i : i + SEQUENCE_LENGTH]
            seq_dir = os.path.join(action_dir, str(existing_seqs + sequences_created))
            os.makedirs(seq_dir, exist_ok=True)
            
            for frame_num, kp in enumerate(window):
                np.save(os.path.join(seq_dir, f"{frame_num}.npy"), kp)
            sequences_created += 1
            
        print(f"    -> Created {sequences_created} augmented sequences via sliding window.")

# --- 3. TRAINING MODULE (Docker Required) ---
def train_lstm(words):
    print("\n--- Phase 3: Training Translation-Invariant LSTM ---")
    print("Since your system uses Python 3.14 (which doesn't support TensorFlow natively),")
    print("please run the Docker training script in your terminal to train the model on this new data:")
    print("  ./train_in_docker.sh")

if __name__ == '__main__':
    # 1. Bypass Cloudflare and download ISL videos from YouTube
    scrape_isl_videos(WORDS_TO_LEARN)
    
    # 2. Chop videos into normalized 30-frame sequences for the LSTM
    process_videos_to_dataset(WORDS_TO_LEARN)
    
    # 3. Instruct user to run Docker
    train_lstm(WORDS_TO_LEARN)
