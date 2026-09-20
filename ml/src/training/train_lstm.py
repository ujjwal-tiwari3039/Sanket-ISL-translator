import os
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import TensorBoard, EarlyStopping
from tensorflow.keras.optimizers import Adam
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import json

# --- 1. CONFIGURATION ---
DATA_PATH = os.path.join('MP_Data')
sequence_length = 30

# Dynamically find all classes in MP_Data that actually have data
all_dirs = [d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))]
valid_actions = []
for d in all_dirs:
    # Check if there's at least one sequence (a folder containing .npy files)
    seqs = [s for s in os.listdir(os.path.join(DATA_PATH, d)) if s.isdigit()]
    if len(seqs) > 0:
        valid_actions.append(d)
        
actions = np.array(sorted(valid_actions))
print(f"Found {len(actions)} classes with data: {actions}")

label_map = {label: num for num, label in enumerate(actions)}

# Save labels.json early
os.makedirs('models', exist_ok=True)
clean_actions = [a.split('. ', 1)[-1].strip() if '. ' in a else a for a in actions]
with open('models/labels.json', 'w') as f:
    json.dump({str(i): action for i, action in enumerate(clean_actions)}, f)
print("Labels saved to models/labels.json")

def normalize_keypoints(res):
    if res[0] == 0 and res[1] == 0:
        # If no pose, return trimmed zeros
        return np.zeros(258)
        
    nose_x = res[0]
    nose_y = res[1]
    
    # Calculate shoulder width for scale normalization (landmarks 11 and 12)
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
            
    # Trim out Face landmarks (1434 features) to prevent LSTM from keying on noise
    # Pose: 0-132, Hands: 1566-1692 -> Total 258 features
    return np.concatenate([res[:132], res[1566:]])

def augment_jitter(sequence, sigma=0.005):
    """Add small coordinate jitter"""
    aug_seq = sequence.copy()
    noise = np.random.normal(0, sigma, aug_seq.shape)
    mask = aug_seq != 0
    aug_seq[mask] += noise[mask]
    return aug_seq

def augment_scale(sequence):
    """Randomly scale all coordinates by 0.85-1.15 to simulate distance variation"""
    aug_seq = sequence.copy()
    scale_factor = np.random.uniform(0.85, 1.15)
    mask = aug_seq != 0
    aug_seq[mask] *= scale_factor
    return aug_seq

def augment_temporal_warp(sequence):
    """Randomly speed up or slow down parts of the sequence via non-linear resampling"""
    N = len(sequence)
    # Create a non-linear time warp
    anchors = np.sort(np.random.uniform(0.3, 0.7, size=2))
    src_times = np.array([0.0, anchors[0], anchors[1], 1.0])
    dst_times = np.array([0.0, np.random.uniform(0.2, 0.5), np.random.uniform(0.5, 0.8), 1.0])
    
    resampled = np.zeros_like(sequence)
    for t in range(N):
        # Map t to warped position
        t_norm = t / (N - 1)
        # Piecewise linear interpolation of the warp function
        t_warped = np.interp(t_norm, dst_times, src_times)
        pos = t_warped * (N - 1)
        i0 = int(np.floor(pos))
        i1 = min(i0 + 1, N - 1)
        alpha = pos - i0
        resampled[t] = (1 - alpha) * sequence[i0] + alpha * sequence[i1]
    return resampled

def augment_mirror(sequence):
    """Mirror the X coordinates of all landmarks to simulate left-right hand swap"""
    aug_seq = sequence.copy()
    # Pose X coordinates are at indices 0, 4, 8, ... (every 4th starting from 0) within first 132
    for frame in aug_seq:
        # Flip pose X (already nose-normalized, so just negate)
        for i in range(0, 132, 4):
            if frame[i] != 0:
                frame[i] = -frame[i]
        # Flip hand X
        for i in range(132, 258, 3):
            if frame[i] != 0:
                frame[i] = -frame[i]
        # Swap left and right hand data (63 features each, starting at index 132)
        lh = frame[132:195].copy()
        rh = frame[195:258].copy()
        frame[132:195] = rh
        frame[195:258] = lh
    return aug_seq

def random_boundary_trim(sequence, max_trim=4):
    """
    Randomly trims 0 to max_trim frames from the beginning and/or end,
    then linearly resamples back to sequence_length (30 frames).
    Teaches the model to tolerate capture boundary variation and imperfect capture windows.
    """
    trim_start = np.random.randint(0, max_trim + 1)
    trim_end = np.random.randint(0, max_trim + 1)
    if len(sequence) - trim_start - trim_end < 15:
        trim_start = 1
        trim_end = 1
        
    cropped = sequence[trim_start : len(sequence) - trim_end]
    N = len(cropped)
    target_length = len(sequence)
    
    resampled = np.zeros_like(sequence)
    for t in range(target_length):
        pos = (t * (N - 1)) / (target_length - 1)
        i0 = int(np.floor(pos))
        i1 = min(i0 + 1, N - 1)
        alpha = pos - i0
        if alpha == 0 or i0 == i1:
            resampled[t] = cropped[i0]
        else:
            resampled[t] = (1 - alpha) * cropped[i0] + alpha * cropped[i1]
    return resampled

# --- 2. LOAD DATA ---
print("Loading data from MP_Data...")
sequences, labels = [], []
for action in actions:
    action_path = os.path.join(DATA_PATH, action)
    sequences_in_class = [s for s in os.listdir(action_path) if s.isdigit()]
    
    for sequence in sequences_in_class:
        window = []
        for frame_num in range(sequence_length):
            frame_path = os.path.join(action_path, str(sequence), f"{frame_num}.npy")
            if os.path.exists(frame_path):
                res = np.load(frame_path)
                res = normalize_keypoints(res)
                window.append(res)
            else:
                window.append(np.zeros(258))
        
        window = np.array(window)
        
        # Original
        sequences.append(window)
        labels.append(label_map[action])
        
        # Aug 1: Light jitter
        sequences.append(augment_jitter(window, sigma=0.005))
        labels.append(label_map[action])

        # Aug 2: Heavy jitter
        sequences.append(augment_jitter(window, sigma=0.012))
        labels.append(label_map[action])

        # Aug 3: Boundary trim & resample
        sequences.append(random_boundary_trim(window))
        labels.append(label_map[action])

        # Aug 4: Scale variation
        sequences.append(augment_scale(window))
        labels.append(label_map[action])

        # Aug 5: Temporal warp (speed variation)
        sequences.append(augment_temporal_warp(window))
        labels.append(label_map[action])

        # Aug 6: Mirror flip
        sequences.append(augment_mirror(window))
        labels.append(label_map[action])

        # Aug 7: Jitter + Scale combo
        sequences.append(augment_jitter(augment_scale(window), sigma=0.008))
        labels.append(label_map[action])

X = np.array(sequences)
y = to_categorical(labels).astype(int)

print(f"Total samples after augmentation: {len(X)} ({len(X) // len(actions)} per class avg)")

# Split the data - safely fallback to non-stratified if counts are too low
try:
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, stratify=labels)
except ValueError:
    print("Warning: Could not stratify split due to low class counts. Splitting randomly.")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1)
print(f"Training data shape: {X_train.shape}")
print(f"Testing data shape: {X_test.shape}")

# Compute class weights
y_train_classes = np.argmax(y_train, axis=1)
class_weights = compute_class_weight('balanced', classes=np.unique(y_train_classes), y=y_train_classes)
# Map unique classes to their weight
class_weight_dict = {cls: weight for cls, weight in zip(np.unique(y_train_classes), class_weights)}
# Ensure all classes from 0 to len(actions)-1 have a weight (fallback to 1.0 if not in train set)
class_weight_dict = {i: class_weight_dict.get(i, 1.0) for i in range(len(actions))}

# --- 3. BUILD AND COMPILE MODEL ---
# Using the SMALLER architecture to prevent overfitting on small dataset
# The heavy augmentation (8x) compensates for limited real samples
log_dir = os.path.join('Logs')
tb_callback = TensorBoard(log_dir=log_dir)
early_stop = EarlyStopping(monitor='val_categorical_accuracy', mode='max', patience=25, restore_best_weights=True)

model = Sequential()
model.add(LSTM(64, return_sequences=True, activation='tanh', input_shape=(sequence_length, 258)))
model.add(Dropout(0.4))
model.add(LSTM(128, return_sequences=True, activation='tanh'))
model.add(Dropout(0.4))
model.add(LSTM(64, return_sequences=False, activation='tanh'))
model.add(Dense(64, activation='relu'))
model.add(Dropout(0.4))
model.add(Dense(32, activation='relu'))
model.add(Dense(actions.shape[0], activation='softmax'))

model.compile(optimizer=Adam(learning_rate=0.0005, clipnorm=1.0), loss='categorical_crossentropy', metrics=['categorical_accuracy'])

# --- 4. TRAIN MODEL ---
print("Starting training...")
model.fit(X_train, y_train, epochs=120, batch_size=64, validation_data=(X_test, y_test), 
          class_weight=class_weight_dict, callbacks=[tb_callback, early_stop])

# --- 5. SAVE MODEL ---
model.save('models/training/action.h5')
print("Model saved to models/action.h5")

# Export to TensorFlow.js
try:
    import sys, types, shutil
    sys.modules['tensorflow_decision_forests'] = types.ModuleType('tensorflow_decision_forests')
    sys.modules['tensorflow_decision_forests.keras'] = types.ModuleType('tensorflow_decision_forests.keras')
    import tensorflowjs as tfjs
    tfjs_dir = os.path.join('apps', 'frontend', 'public', 'models')
    os.makedirs(tfjs_dir, exist_ok=True)
    tfjs.converters.save_keras_model(model, tfjs_dir)
    shutil.copy('models/labels.json', os.path.join(tfjs_dir, 'labels.json'))
    # Post-process model.json for Keras 3 -> TFJS 4 compatibility
    mjson_path = os.path.join(tfjs_dir, 'model.json')
    if os.path.exists(mjson_path):
        with open(mjson_path, 'r') as f:
            mj = json.load(f)
        for layer in mj.get('modelTopology', {}).get('model_config', {}).get('config', {}).get('layers', []):
            if layer.get('class_name') == 'InputLayer':
                cfg = layer.get('config', {})
                if 'batch_shape' in cfg:
                    cfg['batch_input_shape'] = cfg['batch_shape']
                    cfg['batchInputShape'] = cfg['batch_shape']
            # Strip regularizers for TFJS compatibility
            cfg = layer.get('config', {})
            if 'kernel_regularizer' in cfg:
                cfg['kernel_regularizer'] = None
        for manifest in mj.get('weightsManifest', []):
            for w in manifest.get('weights', []):
                if w['name'].startswith('sequential/'):
                    w['name'] = w['name'].replace('sequential/', '')
                w['name'] = w['name'].replace('/lstm_cell/', '/')
        with open(mjson_path, 'w') as f:
            json.dump(mj, f)
    print("Exported and patched model for TensorFlow.js in apps/frontend/public/models/")
except Exception as e:
    print(f"Warning: TFJS export failed: {e}")

# --- 6. EVALUATE ---
os.makedirs('models/training/eval', exist_ok=True)
yhat = model.predict(X_test)
ytrue = np.argmax(y_test, axis=1)
yhat_classes = np.argmax(yhat, axis=1)

report = classification_report(ytrue, yhat_classes, target_names=clean_actions, labels=np.arange(len(actions)), zero_division=0)
print(report)

with open('models/training/eval/classification_report.txt', 'w') as f:
    f.write(report)

cm = confusion_matrix(ytrue, yhat_classes, labels=np.arange(len(actions)))
plt.figure(figsize=(20, 20))
sns.heatmap(cm, annot=False, fmt='d', xticklabels=clean_actions, yticklabels=clean_actions)
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.title('Confusion Matrix')
plt.savefig('models/training/eval/confusion_matrix.png')
print("Evaluation results saved to models/training/eval/")
