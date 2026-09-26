import { normalizeKeypoints, validateFrame } from './normalization.js';

export const SCHEMA_VERSION = 'sanket-258-v1';
export const PREPROCESSING_VERSION = 'nose-xy-shoulder-v1';

function flatten(points, count, channels) {
  if (!points || points.length !== count) throw new Error(`Expected ${count} landmarks`);
  const values = points.flatMap(point => channels.map(channel => {
    const value = channel === 'visibility' && point[channel] === undefined ? 0 : point[channel];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${channel} coordinate`);
    return value;
  }));
  return Float32Array.from(values);
}

export function buildRawFeatures(pose = null, hands = []) {
  const result = new Float32Array(258);
  if (pose?.length) result.set(flatten(pose, 33, ['x', 'y', 'z', 'visibility']));
  for (const [label, offset] of [['Left', 132], ['Right', 195]]) {
    const candidates = hands.filter(hand => hand.label === label)
      .map(hand => flatten(hand.landmarks, 21, ['x', 'y', 'z']));
    if (candidates.length === 1) result.set(candidates[0], offset);
  }
  return validateFrame(result);
}

export function extractKeypoints(poseResult, handResult) {
  const landmarks = handResult?.landmarks ?? [];
  const categories = handResult?.handednesses ?? [];
  if (landmarks.length !== categories.length) throw new Error('Hand landmark/handedness counts differ');
  const hands = landmarks.map((points, i) => ({label: categories[i]?.[0]?.categoryName, landmarks: points}));
  return Array.from(normalizeKeypoints(buildRawFeatures(poseResult?.landmarks?.[0], hands)));
}
