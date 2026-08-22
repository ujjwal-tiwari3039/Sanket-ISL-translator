import os
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import TensorBoard

# --- 1. CONFIGURATION ---
DATA_PATH = os.path.join('MP_Data')
actions = np.array([
    "sleep", "time", "late", "good", "easy", "sister", 
    "brother", "water", "walk", "teach", "apple", "snake", 
    "laptop", "tree", "hello", "thanks"
])
sequence_length = 30

# Create a label map for the actions
label_map = {label: num for num, label in enumerate(actions)}

def normalize_keypoints(res):
    # Nose is at res[0] (x) and res[1] (y)
    if res[0] == 0 and res[1] == 0:
        return res
        
    nose_x = res[0]
    nose_y = res[1]
    
    # Normalize Pose (stride 4)
    for i in range(0, 132, 4):
        if res[i] != 0 or res[i+1] != 0: # Only normalize if point exists
            res[i] -= nose_x
            res[i+1] -= nose_y
            
    # Normalize Face (stride 3)
    for i in range(132, 1566, 3):
        if res[i] != 0 or res[i+1] != 0:
            res[i] -= nose_x
            res[i+1] -= nose_y
            
    # Normalize Hands (stride 3)
    for i in range(1566, 1692, 3):
        if res[i] != 0 or res[i+1] != 0:
            res[i] -= nose_x
            res[i+1] -= nose_y
            
    return res

# --- 2. LOAD DATA ---
print("Loading data from MP_Data...")
sequences, labels = [], []
for action in actions:
    action_path = os.path.join(DATA_PATH, action)
    if not os.path.exists(action_path):
        continue
        
    # Dynamically find how many sequences exist for this word
    no_sequences = len(os.listdir(action_path))
    
    for sequence in range(no_sequences):
        window = []
        for frame_num in range(sequence_length):
            try:
                res = np.load(os.path.join(action_path, str(sequence), "{}.npy".format(frame_num)))
                res = normalize_keypoints(res)
                window.append(res)
            except FileNotFoundError:
                print(f"Warning: Missing data for {action} sequence {sequence} frame {frame_num}")
                window.append(np.zeros(1692)) # Pad missing frames
        sequences.append(window)
        labels.append(label_map[action])

X = np.array(sequences)
y = to_categorical(labels).astype(int)

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.05)
print(f"Training data shape: {X_train.shape}")
print(f"Testing data shape: {X_test.shape}")

# --- 3. BUILD AND COMPILE MODEL ---
log_dir = os.path.join('Logs')
tb_callback = TensorBoard(log_dir=log_dir)

model = Sequential()
model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(sequence_length, 1692)))
model.add(LSTM(128, return_sequences=True, activation='relu'))
model.add(LSTM(64, return_sequences=False, activation='relu'))
model.add(Dense(64, activation='relu'))
model.add(Dense(32, activation='relu'))
model.add(Dense(actions.shape[0], activation='softmax'))

model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])

# --- 4. TRAIN MODEL ---
print("Starting training...")
# Note: For production, you may want more epochs and a validation split.
model.fit(X_train, y_train, epochs=200, callbacks=[tb_callback])

# --- 5. SAVE MODEL ---
os.makedirs('models', exist_ok=True)
model.save('models/action.h5')
print("Model saved to models/action.h5")

import json
with open('models/labels.json', 'w') as f:
    json.dump({str(i): action for i, action in enumerate(actions)}, f)
print("Labels saved to models/labels.json")

# --- 6. EVALUATE ---
from sklearn.metrics import multilabel_confusion_matrix, accuracy_score
yhat = model.predict(X_test)
ytrue = np.argmax(y_test, axis=1).tolist()
yhat = np.argmax(yhat, axis=1).tolist()

print(f"Accuracy Score: {accuracy_score(ytrue, yhat)}")
print("Multilabel Confusion Matrix:")
print(multilabel_confusion_matrix(ytrue, yhat))
