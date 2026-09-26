export const CAPTURE = Object.freeze({minFrames:20, maxFrames:300, sampleIntervalMs:66,
  startMotion:.030, stopMotion:.015, stopFrames:10, preFrames:5, postFrames:4});
// Legacy threshold retained until validation data supports a change. No calibration claim.
export function inferenceConfig(env = {}) {
  const read = (key, fallback) => {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isFinite(value) || value < 0 || value > 1 || env[key] === '') throw new Error(`Invalid ${key}`);
    return value;
  };
  return Object.freeze({confidence:read('VITE_INFERENCE_CONFIDENCE',.40), margin:read('VITE_INFERENCE_MARGIN',0)});
}
export const INFERENCE = inferenceConfig(import.meta.env);

export function captureStopDecision(count, motion, previousLowFrames, automatic, config = CAPTURE) {
  const lowFrames = motion < config.stopMotion ? previousLowFrames + 1 : 0;
  return {lowFrames, evaluate: count >= config.maxFrames,
    postRecord: automatic && count >= config.minFrames && lowFrames >= config.stopFrames};
}

export function decidePrediction(scores, labels, config = INFERENCE) {
  if (scores.length !== labels.length || !scores.length || !Array.from(scores).every(Number.isFinite)) throw new Error('Invalid model output');
  const ranked = Array.from(scores, (score,index) => ({score, action:labels[index]})).sort((a,b)=>b.score-a.score);
  const top = ranked[0], margin = top.score - (ranked[1]?.score ?? 0);
  return {top, ranked, accepted:top.score > config.confidence && margin >= config.margin && !['idle','extra','unknown'].includes(top.action.toLowerCase())};
}

export function validateLabels(labelsMap, outputWidth) {
  const labels = Array.from({length:Object.keys(labelsMap).length},(_,i)=>labelsMap[String(i)]);
  if (labels.length !== outputWidth || labels.some(s=>typeof s !== 'string' || !s.trim()) || new Set(labels).size !== labels.length) throw new Error('Model and label map disagree');
  return labels;
}
