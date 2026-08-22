#!/bin/bash
echo "Starting Docker-based training environment for TensorFlow..."

# Use python 3.11 image which has robust TensorFlow support
sudo docker run --rm -v "$(pwd):/app" -w /app python:3.11-slim bash -c "
  echo 'Installing requirements in container...' &&
  pip install tensorflow==2.15.0 scikit-learn==1.3.2 mediapipe==0.10.14 tensorflowjs==4.17.0 opencv-python-headless &&
  
  echo 'Running training script...' &&
  python phase2_train_lstm.py &&
  
  echo 'Converting model to TensorFlow.js...' &&
  tensorflowjs_converter --input_format keras models/action.h5 frontend/public/models &&
  
  echo '✅ Model trained and exported successfully!'
"
