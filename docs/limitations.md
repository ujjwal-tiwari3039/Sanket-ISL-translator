# Limitations and responsible interpretation

Sanket ISL Translator is a research prototype for selected ISL signs. It is not a complete replacement for a human sign-language interpreter and has no demonstrated production-readiness or clinical use validation.

## Vocabulary and continuous signing

Classification is restricted to the shipped 263 labels. Out-of-vocabulary gestures can be assigned an existing label. The default workflow requires arming and isolating gestures. The active loop supports optional motion-stop hysteresis but does not establish continuous conversational ISL translation. Fingerspelling input is typed manually; this does not demonstrate recognition of a fingerspelling alphabet.

## Camera and signer variation

The code depends on visible pose and hands. Occlusion, motion blur, lighting, framing and signer variation can change landmark quality. Smoothing and shoulder normalization do not prove robustness across cameras, body proportions, regional signing variation or unfamiliar signers. No representative user study is documented.

## Facial expression and grammar

Face landmarks are excluded from LSTM input. An opt-in experimental eyebrow-distance heuristic marks possible questions; it does not model the full non-manual grammar of ISL. English generation receives labels, not video context, and may invent words or change meaning. Softmax confidence is not calibrated certainty.

## Evaluation limitations

The historical trainer augmented before splitting and reused validation for evaluation; the new trainer fixes those mechanisms but cannot repair the old report retroactively. The saved development report is not a signer-independent benchmark. Exact dataset subset, original sample counts and artifact-run provenance need verification. See [model](model.md).

## Demo and deployment limitations

Presentation mode displays scripted words and sentence text without presenting a model confidence score. It must not be described as an end-to-end recognition test. MediaPipe and fonts require external downloads. Public static hosting does not supply the local Express/Ollama services. Demo footage is excluded from the public production build until its redistribution rights are established.

## Rights and maintenance

No project license file was found. Dataset attribution does not settle code, model or demo media licensing. Historical progress notes describe experiments that may not exist in the current source; the current code and these audited documents take precedence.

See [FAQ](faq.md), [dataset](dataset.md) and [research](research.md).

## Source evidence

- [ml/src/training/train_lstm.py](../ml/src/training/train_lstm.py)
- [frontend/src/App.jsx](../apps/frontend/src/App.jsx)
- [frontend/src/DemoMode.jsx](../apps/frontend/src/DemoMode.jsx)
