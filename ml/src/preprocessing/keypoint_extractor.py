import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# The old 'mp.solutions' API was completely removed in MediaPipe 1.0.0
# We are upgrading the code to use the new MediaPipe Tasks API.
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
HandLandmarker = mp.tasks.vision.HandLandmarker
FaceLandmarker = mp.tasks.vision.FaceLandmarker

# Create Landmarkers
pose_options = vision.PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='models/runtime/pose_landmarker.task'))
pose_landmarker = PoseLandmarker.create_from_options(pose_options)

hand_options = vision.HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='models/runtime/hand_landmarker.task'),
    num_hands=2)
hand_landmarker = HandLandmarker.create_from_options(hand_options)

face_options = vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='models/runtime/face_landmarker.task'))
face_landmarker = FaceLandmarker.create_from_options(face_options)

# Drawing utilities
mp_drawing = mp.solutions.drawing_utils if hasattr(mp, 'solutions') else None

def extract_keypoints(pose_result, hand_result, face_result):
    # Pose: 33 landmarks * 4 (x,y,z,visibility)
    pose = np.zeros(33 * 4)
    if pose_result.pose_landmarks:
        pose = np.array([[res.x, res.y, res.z, res.visibility] for res in pose_result.pose_landmarks[0]]).flatten()
        
    # Face: 478 landmarks * 3 (x,y,z)
    face = np.zeros(478 * 3)
    if face_result.face_landmarks:
        face = np.array([[res.x, res.y, res.z] for res in face_result.face_landmarks[0]]).flatten()
        
    # Hands: 21 landmarks * 3 (x,y,z) each
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

def main():
    print("Starting webcam... Press 'q' to quit.")
    cap = cv2.VideoCapture(0)
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Convert the frame to MediaPipe Image
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Run inference using the 3 landmarkers
        pose_result = pose_landmarker.detect(mp_image)
        hand_result = hand_landmarker.detect(mp_image)
        face_result = face_landmarker.detect(mp_image)
        
        # Extract keypoints
        keypoints = extract_keypoints(pose_result, hand_result, face_result)
        
        # Display the result length
        cv2.putText(frame, f"Keypoints Extracted: {keypoints.shape[0]}", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
        cv2.putText(frame, f"Pose: {len(pose_result.pose_landmarks) > 0} | Hands: {len(hand_result.hand_landmarks)} | Face: {len(face_result.face_landmarks) > 0}", 
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 1, cv2.LINE_AA)
        
        # Show to screen
        cv2.imshow('Phase 1 - Sign Language Keypoint Extraction', frame)

        if cv2.waitKey(10) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
