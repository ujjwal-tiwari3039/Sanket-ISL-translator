#!/usr/bin/env bash
set -euo pipefail
# Usage: bash scripts/maintenance/train_in_docker.sh data/include data/custom --output models/candidates/run-1
# Packages provide libGL/libglib for MediaPipe/OpenCV imports. No stale converter paths.
docker run --rm -v "$(pwd):/app" -w /app python:3.11-slim bash -c \
  'apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && pip install -r ml/requirements-training.txt && python -m ml.src.training.train_lstm "$@"' bash "$@"
