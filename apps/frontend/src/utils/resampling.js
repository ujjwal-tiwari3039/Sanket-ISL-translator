/**
 * Time-normalized resampling of variable-length gesture capture
 * to a fixed target length, matching training linspace.
 *
 * Extracts from App.jsx to isolate the pure math function.
 * The implementation must remain identical to the training pipeline.
 *
 * @param {Array} frames - Raw captured frames (each a Float32Array or Array of 258 floats)
 * @param {number} targetLength - Target sequence length (default: 30, matching model input)
 * @returns {Array} Resampled sequence of exactly targetLength frames
 */
export function resampleSequence(frames, targetLength = 30) {
  const N = frames.length;
  if (N === targetLength) {
    return frames;
  }
  if (N < 2) {
    const padded = [...frames];
    while (padded.length < targetLength) {
      padded.push(frames[frames.length - 1] || new Array(258).fill(0));
    }
    return padded;
  }

  const resampled = [];
  for (let t = 0; t < targetLength; t++) {
    const pos = (t * (N - 1)) / (targetLength - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, N - 1);
    const alpha = pos - i0;

    if (alpha === 0 || i0 === i1) {
      resampled.push(frames[i0]);
    } else {
      const f0 = frames[i0];
      const f1 = frames[i1];
      const interpolated = new Float32Array(258);
      for (let k = 0; k < 258; k++) {
        interpolated[k] = (1 - alpha) * f0[k] + alpha * f1[k];
      }
      resampled.push(Array.from(interpolated));
    }
  }
  return resampled;
}
