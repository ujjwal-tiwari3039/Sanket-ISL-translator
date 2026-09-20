# Installation and usage

Run Sanket ISL Translator locally with a camera-enabled browser, Node.js 22.12 or newer, npm, and optionally Ollama with Gemma 2 for sentence generation. The Node requirement accommodates the installed Vite build tooling.

## Get the source

```bash
git clone https://github.com/ujjwal-tiwari3039/Sanket-ISL-translator.git
cd Sanket-ISL-translator
```

## Start the sentence service

```bash
cd apps/backend
npm install
npm start
```

In another terminal, run `ollama serve` if Ollama is not already a service, then `ollama pull gemma2:2b` to acquire the model. The initial download requires a network connection. If Ollama requests fail, Express attempts basic text formatting instead.

## Start the browser application

From the repository root:

```bash
cd apps/frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Grant camera access, arm gesture capture, perform a selected sign, review the candidates and use Finish & Translate. External MediaPipe assets must load successfully. The local backend listens on port 3001 and Ollama on 11434.

## Inspect documentation and build

```bash
cd apps/frontend
npm run build
npm run check:discoverability
npm run preview
```

Documentation pages are static HTML and need no camera or JavaScript. Without a verified production URL the build is marked noindex, omits absolute canonical URLs and emits an empty sitemap. See [deployment](deployment.md) for the production gate.

## Training and reproduction

Python extraction dependencies are in `ml/requirements.txt`; that file alone is insufficient for training. `scripts/maintenance/train_in_docker.sh` specifies TensorFlow 2.15.0, scikit-learn 1.3.2, MediaPipe 0.10.14, TensorFlow.js conversion 4.17.0 and plotting libraries in Python 3.11. Its second converter invocation can overwrite the trainer's compatibility adjustments; validate the exported model in the target browser before replacing shipped artifacts.

The training script expects `MP_Data/<class>/<sequence>/0.npy` through `29.npy`. Acquire lawful source material and MediaPipe assets first, then extract keypoints and run `ml/src/training/train_lstm.py`. Scripts are available, but exact reproduction of the stored evaluation is not established: training data lineage, split seed and a locked Python environment are missing.

See [dataset](dataset.md), [preprocessing](preprocessing.md) and [limitations](limitations.md).

## Source evidence

- [apps/frontend/package.json](../apps/frontend/package.json)
- [apps/backend/package.json](../apps/backend/package.json)
- [ml/requirements.txt](../ml/requirements.txt)
- [train_in_docker.sh](../scripts/maintenance/train_in_docker.sh)
