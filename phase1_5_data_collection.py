import cv2
import numpy as np
import os
import time
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- 1. SET UP THE DATASET PARAMETERS ---
DATA_PATH = os.path.join('MP_Data') 
# Signs we want to train the model to recognize
actions = np.array(['hello', 'thanks', 'iloveyou'])
# Thirty videos worth of data per sign
no_sequences = 30
# Videos are going to be 30 frames in length
sequence_length = 30

# Create the folder structure
for action in actions: 
    for sequence in range(no_sequences):
        try: 
            os.makedirs(os.path.join(DATA_PATH, action, str(sequence)))
        except:
            pass

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
            # Loop through video length aka sequence length
            for frame_num in range(sequence_length):

                ret, frame = cap.read()
                if not ret:
                    break

                # Convert to mediapipe Image
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

                # Detections
                pose_result = pose_landmarker.detect(mp_image)
                hand_result = hand_landmarker.detect(mp_image)
                face_result = face_landmarker.detect(mp_image)
                
                # Apply wait logic for the FIRST frame of every sequence to give you time to reset
                if frame_num == 0: 
                    cv2.putText(frame, 'STARTING COLLECTION', (120,200), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255, 0), 4, cv2.LINE_AA)
                    cv2.putText(frame, f'Collecting frames for {action} Video Number {sequence}', (15,12), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    
                    cv2.imshow('Phase 1.5 - Data Collection', frame)
                    cv2.waitKey(2000) # Wait 2 seconds before starting to record the 30 frames
                else: 
                    cv2.putText(frame, f'Collecting frames for {action} Video Number {sequence}', (15,12), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    
                    cv2.imshow('Phase 1.5 - Data Collection', frame)
                
                # Extract and SAVE the keypoints
                keypoints = extract_keypoints(pose_result, hand_result, face_result)
                npy_path = os.path.join(DATA_PATH, action, str(sequence), str(frame_num))
                np.save(npy_path, keypoints)

                if cv2.waitKey(10) & 0xFF == ord('q'):
                    break
                    
    cap.release()
    cv2.destroyAllWindows()
    print("Data collection complete! You now have a mini dataset.")

if __name__ == '__main__':
    main()
