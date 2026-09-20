import cv2
import os
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
HandLandmarker = mp.tasks.vision.HandLandmarker
FaceLandmarker = mp.tasks.vision.FaceLandmarker

pose_options = vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path='models/pose_landmarker.task'))
pose_landmarker = PoseLandmarker.create_from_options(pose_options)

hand_options = vision.HandLandmarkerOptions(base_options=BaseOptions(model_asset_path='models/hand_landmarker.task'), num_hands=2)
hand_landmarker = HandLandmarker.create_from_options(hand_options)

face_options = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path='models/face_landmarker.task'))
face_landmarker = FaceLandmarker.create_from_options(face_options)

def extract_keypoints(pose_result, hand_result, face_result):
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
            if hand_type == 'Left':
                lh = landmarks
            elif hand_type == 'Right':
                rh = landmarks
    return np.concatenate([pose, face, lh, rh])

# Put the paths to the short sentences here
video_paths = [
    "islmodel/ISL_CSLRT_Corpus/Videos_Sentence_Level/are you free today/are you free today.mp4",
    "islmodel/ISL_CSLRT_Corpus/Videos_Sentence_Level/go and sleep/go and sleep.mp4",
    "islmodel/ISL_CSLRT_Corpus/Videos_Sentence_Level/help me/help me.mp4"
]

DATA_PATH = os.path.join('MP_Data')

def segment_video(video_path):
    print(f"\n--- Segmenting {video_path} ---")
    if not os.path.exists(video_path):
        print(f"Video {video_path} not found!")
        return
        
    sentence = os.path.basename(os.path.dirname(video_path))
    words = sentence.split(" ")
    
    cap = cv2.VideoCapture(video_path)
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
        
        # Save keypoints
        word_dir = os.path.join(DATA_PATH, word.lower())
        # Find next sequence number
        seq_num = 0
        while os.path.exists(os.path.join(word_dir, str(seq_num))):
            seq_num += 1
        out_dir = os.path.join(word_dir, str(seq_num))
        os.makedirs(out_dir, exist_ok=True)
        
        saved_frames = 0
        for i in range(start_frame, end_frame + 1):
            if saved_frames >= 30: # Limit to 30 frames
                break
            f = frames[i]
            rgb_frame = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            pose_result = pose_landmarker.detect(mp_image)
            hand_result = hand_landmarker.detect(mp_image)
            face_result = face_landmarker.detect(mp_image)
            
            keypoints = extract_keypoints(pose_result, hand_result, face_result)
            np.save(os.path.join(out_dir, f"{saved_frames}.npy"), keypoints)
            saved_frames += 1
            
        # Pad with zeros if less than 30 frames
        while saved_frames < 30:
            np.save(os.path.join(out_dir, f"{saved_frames}.npy"), np.zeros(1692))
            saved_frames += 1
        
    cv2.destroyAllWindows()

def main():
    for vp in video_paths:
        segment_video(vp)
        
if __name__ == '__main__':
    main()
