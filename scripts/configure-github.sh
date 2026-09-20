#!/usr/bin/env bash
set -euo pipefail
# Applies only the metadata explicitly requested for this project.
# Requires permission to edit repository settings.
gh repo edit ujjwal-tiwari3039/Sanket-ISL-translator \
  --description 'Real-time Indian Sign Language (ISL) to English translation using computer vision and deep learning.' \
  --add-topic indian-sign-language,isl,sign-language,sign-language-recognition,sign-language-translation,isl-translator,computer-vision,deep-learning,machine-learning,gesture-recognition,mediapipe,tensorflow,tensorflowjs,lstm,browser-based
if [[ -n "${SITE_URL:-}" ]]; then
  gh repo edit ujjwal-tiwari3039/Sanket-ISL-translator --homepage "$SITE_URL"
fi
