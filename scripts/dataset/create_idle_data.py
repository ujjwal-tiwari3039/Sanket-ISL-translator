import os
import numpy as np
import random

DATA_PATH = 'MP_Data'
idle_path = os.path.join(DATA_PATH, 'idle')
os.makedirs(idle_path, exist_ok=True)

# Find all existing classes (excluding idle)
classes = [d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d)) and d != 'idle']
sequences_found = []

for cls in classes:
    seqs = [s for s in os.listdir(os.path.join(DATA_PATH, cls)) if s.isdigit()]
    for s in seqs:
        sequences_found.append(os.path.join(DATA_PATH, cls, s))

random.seed(42)
random.shuffle(sequences_found)

idle_seq_count = 50
print(f"Generating {idle_seq_count} idle sequences...")

for i in range(idle_seq_count):
    out_seq_dir = os.path.join(idle_path, str(i))
    os.makedirs(out_seq_dir, exist_ok=True)
    
    # Pick a random sequence to borrow a resting pose from
    src_seq = sequences_found[i % len(sequences_found)]
    first_frame_path = os.path.join(src_seq, "0.npy")
    
    if os.path.exists(first_frame_path):
        base_frame = np.load(first_frame_path)
    else:
        base_frame = np.zeros(1692)
        
    # Idle mode variations:
    # 0-15: Hands down (zero out hands)
    # 16-30: Hands static (keep first frame hands)
    # 31-49: Hands fidgeting (keep first frame hands + noise)
    
    for frame_idx in range(30):
        frame_data = base_frame.copy()
        
        if i < 16:
            # Zero out hands (indices 1566:1692)
            frame_data[1566:1692] = 0
            # Add tiny pose noise
            noise = np.random.normal(0, 0.001, 132)
            frame_data[:132] += noise
        elif i < 31:
            # Static hands, tiny pose noise
            noise = np.random.normal(0, 0.001, 1692)
            frame_data += noise
        else:
            # Fidgeting hands
            noise = np.random.normal(0, 0.005, 1692)
            frame_data += noise
            
        np.save(os.path.join(out_seq_dir, f"{frame_idx}.npy"), frame_data)

print("Idle data generation complete.")
