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

Use Python 3.11. Install `ml/requirements.txt` for collection/extraction or `ml/requirements-training.txt` for training/evaluation. Run module commands from the repository root:

```bash
python -m ml.src.data.data_collection --camera 0 --label hello --samples 15
python -m ml.src.data.process_include --videos /path/to/include --output data/include
python -m ml.src.data.validate_dataset data/include data/custom
python -m ml.src.training.train_lstm data/include data/custom --output models/candidates/run-01
```

See [custom data](custom-dataset.md), [training](training.md) and [evaluation](evaluation.md). Legacy NPY data requires explicit conversion/acknowledgement. The old report cannot be exactly reproduced because its original source lineage and split seed were not recorded.

## Source evidence

- [apps/frontend/package.json](../apps/frontend/package.json)
- [apps/backend/package.json](../apps/backend/package.json)
- [ml/requirements.txt](../ml/requirements.txt)
- [train_in_docker.sh](../scripts/maintenance/train_in_docker.sh)
