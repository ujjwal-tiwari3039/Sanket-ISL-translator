import os
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import TensorBoard, EarlyStopping
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import json

# --- 1. CONFIGURATION ---
DATA_PATH = os.path.join('MP_Data')
sequence_length = 30

# Dynamically find all classes in MP_Data
actions = np.array([d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))])
actions.sort()
print(f"Found {len(actions)} classes: {actions}")

label_map = {label: num for num, label in enumerate(actions)}

# Save labels.json early
os.makedirs('models', exist_ok=True)
with open('models/labels.json', 'w') as f:
    json.dump({str(i): action for i, action in enumerate(actions)}, f)
print("Labels saved to models/labels.json")

def normalize_keypoints(res):
    if res[0] == 0 and res[1] == 0:
        return res
    nose_x = res[0]
    nose_y = res[1]
    
    for i in range(0, 132, 4):
        if res[i] != 0 or res[i+1] != 0:
            res[i] -= nose_x
            res[i+1] -= nose_y
    for i in range(132, 1566, 3):
        if res[i] != 0 or res[i+1] != 0:
            res[i] -= nose_x
            res[i+1] -= nose_y
    for i in range(1566, 1692, 3):
        if res[i] != 0 or res[i+1] != 0:
            res[i] -= nose_x
            res[i+1] -= nose_y
    return res

def augment_sequence(sequence):
    """Add small coordinate jitter"""
    aug_seq = sequence.copy()
    noise = np.random.normal(0, 0.005, aug_seq.shape)
    
    # Don't add noise to visibility or zeros
    mask = aug_seq != 0
    aug_seq[mask] += noise[mask]
    return aug_seq

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
                window.append(np.zeros(1692))
        
        sequences.append(window)
        labels.append(label_map[action])
        
        # Add an augmented version to double the dataset
        sequences.append(augment_sequence(np.array(window)))
        labels.append(label_map[action])

X = np.array(sequences)
y = to_categorical(labels).astype(int)

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, stratify=labels)
print(f"Training data shape: {X_train.shape}")
print(f"Testing data shape: {X_test.shape}")

# Compute class weights
y_train_classes = np.argmax(y_train, axis=1)
class_weights = compute_class_weight('balanced', classes=np.unique(y_train_classes), y=y_train_classes)
class_weight_dict = dict(enumerate(class_weights))

# --- 3. BUILD AND COMPILE MODEL ---
log_dir = os.path.join('Logs')
tb_callback = TensorBoard(log_dir=log_dir)
early_stop = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)

model = Sequential()
model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(sequence_length, 1692)))
model.add(Dropout(0.2))
model.add(LSTM(128, return_sequences=True, activation='relu'))
model.add(Dropout(0.2))
model.add(LSTM(64, return_sequences=False, activation='relu'))
model.add(Dense(64, activation='relu'))
model.add(Dense(32, activation='relu'))
model.add(Dense(actions.shape[0], activation='softmax'))

model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])

# --- 4. TRAIN MODEL ---
print("Starting training...")
model.fit(X_train, y_train, epochs=200, batch_size=32, validation_data=(X_test, y_test), 
          class_weight=class_weight_dict, callbacks=[tb_callback, early_stop])

# --- 5. SAVE MODEL ---
model.save('models/action.h5')
print("Model saved to models/action.h5")

# --- 6. EVALUATE ---
os.makedirs('models/eval', exist_ok=True)
yhat = model.predict(X_test)
ytrue = np.argmax(y_test, axis=1)
yhat_classes = np.argmax(yhat, axis=1)

report = classification_report(ytrue, yhat_classes, target_names=actions)
print(report)

with open('models/eval/classification_report.txt', 'w') as f:
    f.write(report)

cm = confusion_matrix(ytrue, yhat_classes)
plt.figure(figsize=(20, 20))
sns.heatmap(cm, annot=False, fmt='d', xticklabels=actions, yticklabels=actions)
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.title('Confusion Matrix')
plt.savefig('models/eval/confusion_matrix.png')
print("Evaluation results saved to models/eval/")
