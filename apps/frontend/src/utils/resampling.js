import { validateFrame } from './normalization.js';

export function resampleSequence(frames, targetLength = 30) {
  if (!Number.isInteger(targetLength) || targetLength < 2) throw new Error('targetLength must be an integer >= 2');
  if (!Array.isArray(frames) || frames.length < 2) throw new Error('At least two captured frames required');
  const source = frames.map(frame => Float32Array.from(validateFrame(frame)));
  return Array.from({length: targetLength}, (_, t) => {
    const pos = t * (source.length - 1) / (targetLength - 1);
    const i0 = Math.floor(pos), i1 = Math.min(i0 + 1, source.length - 1), alpha = pos - i0;
    const result = Float32Array.from(source[i0], (v, k) => (1 - alpha) * v + alpha * source[i1][k]);
    return Array.from(validateFrame(result));
  });
}
