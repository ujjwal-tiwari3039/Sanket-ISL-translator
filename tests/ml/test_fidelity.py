import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model

model = load_model('models/action.h5')
# find a valid sequence
DATA_PATH = 'MP_Data'
class_name = os.listdir(DATA_PATH)[0]
seq_name = os.listdir(os.path.join(DATA_PATH, class_name))[0]
seq_path = os.path.join(DATA_PATH, class_name, seq_name)

window = []
for i in range(30):
    res = np.load(os.path.join(seq_path, f"{i}.npy"))
    # Apply the same normalization as training
    if res[0] != 0 or res[1] != 0:
        nose_x, nose_y = res[0], res[1]
        for j in range(0, 132, 4):
            if res[j] != 0 or res[j+1] != 0: res[j] -= nose_x; res[j+1] -= nose_y
        for j in range(132, 1566, 3):
            if res[j] != 0 or res[j+1] != 0: res[j] -= nose_x; res[j+1] -= nose_y
        for j in range(1566, 1692, 3):
            if res[j] != 0 or res[j+1] != 0: res[j] -= nose_x; res[j+1] -= nose_y
    window.append(res)

window = np.array([window])
preds = model.predict(window)
print("Python Predictions top 5:")
top5_idx = np.argsort(preds[0])[-5:][::-1]
for idx in top5_idx:
    print(f"{idx}: {preds[0][idx]}")

# save window to json so we can test with JS
import json
with open('test_sequence.json', 'w') as f:
    json.dump(window.tolist(), f)
print(f"Tested class: {class_name}")
