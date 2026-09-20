import cv2, os, json
import numpy as np
import mediapipe as mp
from tensorflow.keras.models import load_model

model = load_model('models/action.h5')
with open('models/labels.json', 'r') as f:
    label_map = json.load(f)
actions = [label_map[str(i)] for i in range(len(label_map))]

BaseOptions = mp.tasks.BaseOptions
pose_landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(
    mp.tasks.vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path='models/pose_landmarker.task')))
hand_landmarker = mp.tasks.vision.HandLandmarker.create_from_options(
    mp.tasks.vision.HandLandmarkerOptions(base_options=BaseOptions(model_asset_path='models/hand_landmarker.task'), num_hands=2))

def normalize_keypoints(res):
    if res[0] == 0 and res[1] == 0: return np.zeros(258)
    nose_x, nose_y = res[0], res[1]
    l_shoulder_x, l_shoulder_y = res[11*4], res[11*4+1]
    r_shoulder_x, r_shoulder_y = res[12*4], res[12*4+1]
    shoulder_width = np.sqrt((l_shoulder_x - r_shoulder_x)**2 + (l_shoulder_y - r_shoulder_y)**2)
    scale = shoulder_width if shoulder_width > 0.01 else 1.0
    for i in range(0, 132, 4):
        if res[i] != 0 or res[i+1] != 0:
            res[i] = (res[i] - nose_x) / scale
            res[i+1] = (res[i+1] - nose_y) / scale
    for i in range(132, 1566, 3):
        if res[i] != 0 or res[i+1] != 0:
            res[i] = (res[i] - nose_x) / scale
            res[i+1] = (res[i+1] - nose_y) / scale
    for i in range(1566, 1692, 3):
        if res[i] != 0 or res[i+1] != 0:
            res[i] = (res[i] - nose_x) / scale
            res[i+1] = (res[i+1] - nose_y) / scale
    return np.concatenate([res[:132], res[1566:]])

def extract_raw(pose_result, hand_result):
    pose = np.zeros(33 * 4)
    if pose_result.pose_landmarks:
        pose = np.array([[res.x, res.y, res.z, res.visibility] for res in pose_result.pose_landmarks[0]]).flatten()
    lh = np.zeros(21 * 3)
    rh = np.zeros(21 * 3)
    if hand_result.hand_landmarks:
        for idx, handedness in enumerate(hand_result.handedness):
            if handedness[0].category_name == 'Left': lh = np.array([[res.x, res.y, res.z] for res in hand_result.hand_landmarks[idx]]).flatten()
            elif handedness[0].category_name == 'Right': rh = np.array([[res.x, res.y, res.z] for res in hand_result.hand_landmarks[idx]]).flatten()
    res = np.zeros(1692)
    res[:132] = pose
    res[1566:1629] = lh
    res[1629:1692] = rh
    return res

def get_hand_center(raw_features):
    centers = []
    lh = raw_features[1566:1629]
    rh = raw_features[1629:1692]
    if np.any(lh):
        xs = lh[0::3]; ys = lh[1::3]; centers.append((np.mean(xs[xs!=0]), np.mean(ys[ys!=0])))
    if np.any(rh):
        xs = rh[0::3]; ys = rh[1::3]; centers.append((np.mean(xs[xs!=0]), np.mean(ys[ys!=0])))
    return centers

def resample_sequence(sequence, target_length=30):
    if len(sequence) == 0: return np.zeros((target_length, 258))
    if len(sequence) == 1: return np.array([sequence[0]] * target_length)
    sequence = np.array(sequence)
    N = len(sequence)
    resampled = np.zeros((target_length, 258))
    for t in range(target_length):
        pos = (t * (N - 1)) / (target_length - 1)
        i0 = int(np.floor(pos))
        i1 = min(i0 + 1, N - 1)
        alpha = pos - i0
        resampled[t] = (1 - alpha) * sequence[i0] + alpha * sequence[i1]
    return resampled

manifest = []
demo_dir = "frontend/public/demo/videos"
if not os.path.exists(demo_dir): os.makedirs(demo_dir)

videos = [f for f in os.listdir(demo_dir) if f.endswith('.MOV') or f.endswith('.mp4')]
for vid in videos:
    print(f"Processing {vid}...")
    cap = cv2.VideoCapture(os.path.join(demo_dir, vid))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    
    state = "IDLE"
    stroke_buffer = []
    prev_centers = []
    low_vel_frames = 0
    words = []
    frame_idx = 0
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        p_res = pose_landmarker.detect(mp_img)
        h_res = hand_landmarker.detect(mp_img)
        
        raw = extract_raw(p_res, h_res)
        norm = normalize_keypoints(raw.copy())
        
        centers = get_hand_center(raw)
        vel = 0
        if centers and prev_centers:
            dists = []
            for c in centers:
                min_d = min([np.sqrt((c[0]-pc[0])**2 + (c[1]-pc[1])**2) for pc in prev_centers]) if prev_centers else 0
                dists.append(min_d)
            vel = max(dists) if dists else 0
        prev_centers = centers
        
        if state == "IDLE":
            if centers and vel > 0.038:
                state = "RECORDING"
                stroke_buffer = [norm]
                start_frame = frame_idx
                low_vel_frames = 0
        elif state == "RECORDING":
            stroke_buffer.append(norm)
            if vel < 0.018:
                low_vel_frames += 1
            else:
                low_vel_frames = 0
                
            if low_vel_frames >= 15 or len(stroke_buffer) >= 60:
                # Evaluate
                seq = resample_sequence(stroke_buffer)
                pred = model.predict(np.expand_dims(seq, axis=0), verbose=0)[0]
                conf = np.max(pred)
                cls = actions[np.argmax(pred)]
                if conf > 0.7 and cls != "idle":
                    words.append({"word": cls, "timestamp": frame_idx / fps, "confidence": float(conf)})
                state = "IDLE"
                stroke_buffer = []
        frame_idx += 1
    
    manifest.append({
        "video": vid,
        "words": words,
        "sentence": ""
    })

with open("frontend/public/demo/manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

print("Manifest generated!")
