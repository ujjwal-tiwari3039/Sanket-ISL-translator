import cv2
import numpy as np
import os
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- 1. SET UP THE DATASET PARAMETERS ---
DATA_PATH = os.path.join('MP_Data')

# 15 Gap-filling words
actions = np.array([
    'yes', 'no', 'please', 'sorry', 'who', 
    'what', 'where', 'why', 'how', 'stop', 
    'help', 'now', 'later', 'name', 'friend'
])
no_sequences = 15 # 15 takes per word
sequence_length = 30 # 30 frames per video

# Create the folder structure
for action in actions:
    for sequence in range(no_sequences):
        os.makedirs(os.path.join(DATA_PATH, action, str(sequence)), exist_ok=True)

# --- 2. SETUP MEDIAPIPE ---
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

# --- 3. DATA COLLECTION LOOP ---
def main():
    cap = cv2.VideoCapture(0)
    print("Starting data collection. Get ready!")
    
    # Loop through actions
    for action in actions:
        # Loop through sequences aka videos
        for sequence in range(no_sequences):
            # Show a prep screen before starting the recording
            while True:
                ret, frame = cap.read()
                if not ret: break
                
                # Flip frame horizontally for selfie view
                frame = cv2.flip(frame, 1)
                
                cv2.putText(frame, f"SIGN: {action.upper()}", (120, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
                cv2.putText(frame, f"Take {sequence+1}/{no_sequences}", (120, 250), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
                cv2.putText(frame, "Press 'r' to record this take (or 's' to skip word)", (50, 400), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                cv2.imshow('Recording Helper', frame)
                
                key = cv2.waitKey(10) & 0xFF
                if key == ord('r'):
                    break
                elif key == ord('s'):
                    break
            
            if key == ord('s'):
                break # Move to next action
                
            # Recording frames
            for frame_num in range(sequence_length):
                ret, frame = cap.read()
                if not ret: break
                
                frame = cv2.flip(frame, 1)

                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

                pose_result = pose_landmarker.detect(mp_image)
                hand_result = hand_landmarker.detect(mp_image)
                face_result = face_landmarker.detect(mp_image)
                
                cv2.putText(frame, f"RECORDING: {action.upper()} ({sequence+1}/{no_sequences})", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                cv2.putText(frame, f"Frame {frame_num+1}/{sequence_length}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
                
                # Draw simple progress bar
                progress = int((frame_num + 1) / sequence_length * 600)
                cv2.rectangle(frame, (20, 430), (20 + progress, 450), (0, 255, 0), -1)
                
                cv2.imshow('Recording Helper', frame)
                cv2.waitKey(30) # Delay slightly to make the 30 frames represent roughly 1 second of video
                
                keypoints = extract_keypoints(pose_result, hand_result, face_result)
                npy_path = os.path.join(DATA_PATH, action, str(sequence), str(frame_num))
                np.save(npy_path, keypoints)

    cap.release()
    cv2.destroyAllWindows()
    print("Data collection complete!")

if __name__ == '__main__':
    main()
