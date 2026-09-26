// nose-xy-shoulder-v1; see docs/landmark-schema.md and Python normalize.py.
export function validateFrame(frame) {
  if (!frame || frame.length !== 258 || !Array.from(frame).every(v => typeof v === 'number' && Number.isFinite(v))) {
    throw new Error('Expected 258 finite numeric features');
  }
  return frame;
}

export function normalizeKeypoints(raw) {
  const result = Float32Array.from(validateFrame(raw));
  validateFrame(result);
  const nx = result[0], ny = result[1];
  if (nx === 0 && ny === 0) return new Float32Array(258);
  const dx = result[44] - result[48], dy = result[45] - result[49];
  const width = Math.sqrt(dx * dx + dy * dy);
  const scale = width > 0.01 ? width : 1;
  for (let i = 0; i < 258; i += i < 132 ? 4 : 3) {
    if (result[i] !== 0 || result[i + 1] !== 0) {
      result[i] = (result[i] - nx) / scale;
      result[i + 1] = (result[i + 1] - ny) / scale;
    }
  }
  return validateFrame(result);
}
