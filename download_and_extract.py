import os
import sys
import glob
import shutil
import zipfile
import signal
import urllib.request
import json
import subprocess
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- CONFIGURATION ---
DATA_PATH = 'MP_Data'
TEMP_ZIP = 'temp_dataset.zip'
TEMP_DIR = 'temp_videos'
PROGRESS_FILE = 'completed_zips.txt'
SEQUENCE_LENGTH = 30
API_URL = "https://zenodo.org/api/records/4010759"

os.makedirs(DATA_PATH, exist_ok=True)

# Clean up on exit or interrupt
def cleanup(signum=None, frame=None):
    print("\n[CLEANUP] Cleaning temporary download files...")
    if os.path.exists(TEMP_ZIP):
        try: os.remove(TEMP_ZIP)
        except Exception: pass
    if os.path.exists(TEMP_DIR):
        try: shutil.rmtree(TEMP_DIR, ignore_errors=True)
        except Exception: pass
    if signum is not None:
        sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

# --- INITIALIZE MEDIAPIPE ---
print("[INIT] Loading MediaPipe Pose and Hand Landmarkers...")
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
HandLandmarker = mp.tasks.vision.HandLandmarker

pose_options = vision.PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='models/pose_landmarker.task')
)
pose_landmarker = PoseLandmarker.create_from_options(pose_options)

hand_options = vision.HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='models/hand_landmarker.task'),
    num_hands=2
)
hand_landmarker = HandLandmarker.create_from_options(hand_options)

def extract_keypoints(pose_result, hand_result):
    # Pose: 33 landmarks * 4 (x, y, z, visibility) = 132
    pose = np.zeros(33 * 4)
    if pose_result.pose_landmarks:
        pose = np.array([[res.x, res.y, res.z, res.visibility] for res in pose_result.pose_landmarks[0]]).flatten()

    # Face: filled with 0s to maintain 1692 compatibility while saving 60% CPU time
    face = np.zeros(478 * 3)

    # Hands: Left & Right, 21 landmarks * 3 (x, y, z) = 63 each
    lh = np.zeros(21 * 3)
    rh = np.zeros(21 * 3)
    if hand_result.hand_landmarks:
        for idx, handedness in enumerate(hand_result.handedness):
            hand_type = handedness[0].category_name
            landmarks = np.array([[res.x, res.y, res.z] for res in hand_result.hand_landmarks[idx]]).flatten()
            if hand_type == 'Left':
                lh = landmarks
            elif hand_type == 'Right':
                rh = landmarks

    return np.concatenate([pose, face, lh, rh])

def process_video(video_path, word, seq_num):
    cap = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()

    if len(frames) == 0:
        return False

    out_dir = os.path.join(DATA_PATH, word, str(seq_num))
    os.makedirs(out_dir, exist_ok=True)

    # Sample exactly 30 frames linearly
    indices = np.linspace(0, len(frames) - 1, SEQUENCE_LENGTH, dtype=int)

    for i, idx in enumerate(indices):
        frame = frames[idx]
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        pose_result = pose_landmarker.detect(mp_image)
        hand_result = hand_landmarker.detect(mp_image)

        keypoints = extract_keypoints(pose_result, hand_result)
        npy_path = os.path.join(out_dir, f"{i}.npy")
        np.save(npy_path, keypoints)

    return True

def get_completed_zips():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return set(line.strip() for line in f if line.strip())
    return set()

def mark_zip_completed(zip_name):
    with open(PROGRESS_FILE, 'a') as f:
        f.write(f"{zip_name}\n")

def main():
    json_path = 'zenodo_files.json'
    if not os.path.exists(json_path) or os.path.getsize(json_path) == 0:
        print("[INFO] Fetching INCLUDE dataset file list from Zenodo via curl...")
        subprocess.run(['curl', '-s', API_URL, '-o', json_path])

    with open(json_path, 'r') as f:
        data = json.load(f)

    # Only process .zip archives
    all_files = [f for f in data.get('files', []) if f['key'].endswith('.zip')]
    all_files.sort(key=lambda x: x['key'])

    completed = get_completed_zips()
    remaining = [f for f in all_files if f['key'] not in completed]

    print(f"[STATUS] Total zip archives: {len(all_files)}")
    print(f"[STATUS] Already completed:  {len(completed)}")
    print(f"[STATUS] Remaining to process: {len(remaining)}\n")

    if not remaining:
        print("[SUCCESS] All dataset archives have already been processed!")
        return

    for idx, file_info in enumerate(remaining, 1):
        zip_name = file_info['key']
        dl_url = file_info['links']['self']
        size_mb = file_info['size'] / (1024 * 1024)

        print(f"\n=======================================================")
        print(f"[{idx}/{len(remaining)}] Processing {zip_name} ({size_mb:.1f} MB)")
        print(f"=======================================================")

        # Clean previous temp files
        cleanup()

        # Step 1: Download using wget (fast, reliable with resume/progress)
        print(f"-> Downloading {zip_name}...")
        download_cmd = ['wget', '-c', '-q', '--show-progress', '-O', TEMP_ZIP, dl_url]
        res = subprocess.run(download_cmd)
        if res.returncode != 0 or not os.path.exists(TEMP_ZIP):
            print(f"[ERROR] Failed to download {zip_name}. Retrying with urllib...")
            urllib.request.urlretrieve(dl_url, TEMP_ZIP)

        # Step 2: Extract zip
        print(f"-> Unpacking {zip_name}...")
        os.makedirs(TEMP_DIR, exist_ok=True)
        try:
            with zipfile.ZipFile(TEMP_ZIP, 'r') as zip_ref:
                zip_ref.extractall(TEMP_DIR)
        except Exception as e:
            print(f"[ERROR] Corrupted zip {zip_name}: {e}. Skipping...")
            cleanup()
            continue

        # Step 3: Find all videos
        video_files = glob.glob(os.path.join(TEMP_DIR, '**', '*.MOV'), recursive=True) + \
                      glob.glob(os.path.join(TEMP_DIR, '**', '*.mp4'), recursive=True)
        video_files.sort()

        print(f"-> Found {len(video_files)} videos in {zip_name}. Extracting MediaPipe landmarks...")

        processed_count = 0
        for vid_path in video_files:
            # The parent folder name is the sign word
            word = os.path.basename(os.path.dirname(vid_path)).lower()
            if not word or word == 'temp_videos':
                continue

            word_out_path = os.path.join(DATA_PATH, word)
            seq_num = 0
            if os.path.exists(word_out_path):
                existing_seqs = [int(s) for s in os.listdir(word_out_path) if s.isdigit()]
                if existing_seqs:
                    seq_num = max(existing_seqs) + 1

            if process_video(vid_path, word, seq_num):
                processed_count += 1
                if processed_count % 10 == 0 or processed_count == len(video_files):
                    print(f"   [{processed_count}/{len(video_files)}] Processed '{word}' (seq {seq_num})")

        # Step 4: Cleanup & mark as done
        print(f"-> Successfully extracted {processed_count} video sequences from {zip_name}!")
        cleanup()
        mark_zip_completed(zip_name)

    print("\n[COMPLETE] All INCLUDE dataset archives processed successfully into MP_Data!")

if __name__ == '__main__':
    main()
