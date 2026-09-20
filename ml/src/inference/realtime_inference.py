import cv2
import numpy as np
import os
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from tensorflow.keras.models import load_model
import google.generativeai as genai
import threading

# --- 1. CONFIGURATION ---
# IMPORTANT: Replace with your actual Gemini API key when running locally
# genai.configure(api_key="YOUR_GEMINI_API_KEY")

import json
try:
    with open('models/labels.json', 'r') as f:
        label_map = json.load(f)
    actions = np.array([label_map[str(i)] for i in range(len(label_map))])
except FileNotFoundError:
    print("models/labels.json not found. Please train the model first.")
    actions = np.array([])
sequence_length = 30
model_path = 'models/action.h5'

# Load the trained model
print("Loading model...")
model = load_model(model_path)
print("Model loaded.")

# --- 2. MEDIAPIPE SETUP ---
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

# --- 3. LLM SENTENCE ASSEMBLY ---
# We will use Gemini to stitch recognized signs into a sentence.
assembled_sentence = ""
is_assembling = False

def assemble_sentence_llm(sign_sequence):
    global assembled_sentence, is_assembling
    is_assembling = True
    try:
        # Prompt the model to convert the sequence of signs into a natural sentence.
        prompt = f"Convert these isolated sign language words into a natural, grammatical English sentence: {', '.join(sign_sequence)}. Keep it short and direct."
        # model = genai.GenerativeModel('gemini-1.5-flash')
        # response = model.generate_content(prompt)
        # assembled_sentence = response.text.strip()
        
        # MOCK IMPLEMENTATION (Replace above code once API key is provided)
        print(f"[LLM Prompt] {prompt}")
        if "hello" in sign_sequence and "thanks" in sign_sequence:
            assembled_sentence = "Hello, and thank you."
        elif "iloveyou" in sign_sequence:
            assembled_sentence = "I love you."
        else:
            assembled_sentence = " ".join(sign_sequence).capitalize() + "."
    except Exception as e:
        print("LLM Error:", e)
        assembled_sentence = " ".join(sign_sequence)
    is_assembling = False

# --- 4. REAL-TIME INFERENCE LOOP ---
def main():
    global assembled_sentence, is_assembling
    
    sequence = []
    sentence = []
    predictions = []
    threshold = 0.7 # Confidence threshold
    
    cap = cv2.VideoCapture(0)
    print("Starting real-time inference...")
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break

        # Convert to mediapipe Image
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Detections
        pose_result = pose_landmarker.detect(mp_image)
        hand_result = hand_landmarker.detect(mp_image)
        face_result = face_landmarker.detect(mp_image)
        
        # 4a. Simple "Question" Heuristic (Non-Manual Feature)
        # Check if eyebrows are raised (very basic heuristic based on face landmarks)
        is_question = False
        if face_result.face_landmarks:
            landmarks = face_result.face_landmarks[0]
            # Indices for eyebrows vs eyes (simplified logic)
            # 105 (inner right eyebrow), 159 (upper right eye)
            # 334 (inner left eyebrow), 386 (upper left eye)
            right_dist = abs(landmarks[105].y - landmarks[159].y)
            left_dist = abs(landmarks[334].y - landmarks[386].y)
            avg_dist = (right_dist + left_dist) / 2
            
            # If distance is above a threshold, eyebrows are raised -> likely a question
            if avg_dist > 0.04: # Value might need tuning based on camera distance
                is_question = True

        keypoints = extract_keypoints(pose_result, hand_result, face_result)
        sequence.append(keypoints)
        sequence = sequence[-sequence_length:]
        
        if len(sequence) == sequence_length:
            res = model.predict(np.expand_dims(sequence, axis=0))[0]
            predictions.append(np.argmax(res))
            
            # Checking stability of prediction
            if np.unique(predictions[-10:])[0] == np.argmax(res): 
                if res[np.argmax(res)] > threshold:
                    predicted_action = actions[np.argmax(res)]
                    if is_question:
                        predicted_action += "?"
                        
                    if len(sentence) > 0: 
                        if sentence[-1] != predicted_action:
                            sentence.append(predicted_action)
                    else:
                        sentence.append(predicted_action)
                        
            # Keep the sentence array small for the prompt
            if len(sentence) > 5: 
                sentence = sentence[-5:]
                
            # Trigger LLM assembly in a background thread every 3 words or on a specific trigger
            if len(sentence) >= 2 and not is_assembling:
                threading.Thread(target=assemble_sentence_llm, args=(sentence.copy(),)).start()
                sentence = [] # Clear after sending to LLM

        # UI / Display Logic
        cv2.rectangle(frame, (0,0), (640, 80), (245, 117, 16), -1)
        
        # Show detected signs
        cv2.putText(frame, ' '.join(sentence), (3,30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
        
        # Show LLM Assembled Sentence
        cv2.putText(frame, f"LLM: {assembled_sentence}", (3, 70),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA)
        
        # Show if it's detecting a question expression
        if is_question:
            cv2.putText(frame, "[?] Eyebrows raised", (10, 110), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
        
        cv2.imshow('Phase 3 - Real Time Sign Language Translator', frame)
        
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
