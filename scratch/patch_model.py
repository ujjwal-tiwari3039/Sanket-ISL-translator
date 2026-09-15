import re

with open("phase2_train_lstm.py", "r") as f:
    content = f.read()

# Replace imports to include BatchNormalization and l2
import_pattern = re.compile(r"from tensorflow\.keras\.layers import LSTM, Dense, Dropout")
content = import_pattern.sub("from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization\nfrom tensorflow.keras.regularizers import l2", content)

# Replace the model architecture
model_pattern = re.compile(r"model = Sequential\(\)\nmodel\.add\(LSTM\(64, return_sequences=True, activation='tanh', input_shape=\(sequence_length, 258\)\)\)\nmodel\.add\(Dropout\(0\.2\)\)\nmodel\.add\(LSTM\(128, return_sequences=True, activation='tanh'\)\)\nmodel\.add\(Dropout\(0\.2\)\)\nmodel\.add\(LSTM\(64, return_sequences=False, activation='tanh'\)\)\nmodel\.add\(Dense\(64, activation='relu'\)\)\nmodel\.add\(Dense\(32, activation='relu'\)\)\nmodel\.add\(Dense\(actions\.shape\[0\], activation='softmax'\)\)")

new_model = """model = Sequential()
model.add(LSTM(128, return_sequences=True, activation='tanh', input_shape=(sequence_length, 258)))
model.add(BatchNormalization())
model.add(Dropout(0.3))
model.add(LSTM(256, return_sequences=True, activation='tanh'))
model.add(BatchNormalization())
model.add(Dropout(0.3))
model.add(LSTM(128, return_sequences=False, activation='tanh'))
model.add(BatchNormalization())
model.add(Dense(128, activation='relu', kernel_regularizer=l2(0.01)))
model.add(Dropout(0.3))
model.add(Dense(64, activation='relu', kernel_regularizer=l2(0.01)))
model.add(Dense(actions.shape[0], activation='softmax'))"""

content = model_pattern.sub(new_model, content)

with open("phase2_train_lstm.py", "w") as f:
    f.write(content)

print("Model architecture patched!")
