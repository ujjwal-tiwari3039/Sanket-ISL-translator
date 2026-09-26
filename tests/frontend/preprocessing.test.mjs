import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { buildRawFeatures, extractKeypoints } from '../../apps/frontend/src/utils/features.js';
import { normalizeKeypoints } from '../../apps/frontend/src/utils/normalization.js';
import { resampleSequence } from '../../apps/frontend/src/utils/resampling.js';
const { frames } = JSON.parse(fs.readFileSync(new URL('../fixtures/landmarks.json', import.meta.url)));
const {pose, hands} = frames[0];

test('hand order, absent sides and ambiguous sides have stable slots', () => {
  assert.deepEqual(buildRawFeatures(pose, hands), buildRawFeatures(pose, [...hands].reverse()));
  const missing = buildRawFeatures(pose, [hands[1]]);
  assert(missing.slice(132, 195).every(v => v === 0));
  assert.equal(missing[195], Math.fround(hands[1].landmarks[0].x));
  assert(buildRawFeatures(pose, [hands[0], hands[0]]).slice(132).every(v => v === 0));
  assert(buildRawFeatures(pose, [{...hands[0], label: 'Unknown'}]).slice(132).every(v => v === 0));
});
test('missing pose zeros complete normalized frame; source stays untouched', () => {
  const raw = buildRawFeatures(null, hands), copy = raw.slice();
  assert(normalizeKeypoints(raw).every(v => v === 0));
  assert.deepEqual(raw, copy);
});
test('nose anchor, visibility and depth are preserved as specified', () => {
  const raw = buildRawFeatures(pose, hands), normalized = normalizeKeypoints(raw);
  assert.equal(normalized[0], 0); assert.equal(normalized[1], 0);
  assert.equal(normalized[47], raw[47]); assert.equal(normalized[134], raw[134]);
  assert(Math.abs(normalized[132] - (-1)) < 1e-6);
});
test('resampling endpoints and shape; invalid inputs reject', () => {
  const input = frames.map(f => normalizeKeypoints(buildRawFeatures(f.pose, f.hands)));
  const result = resampleSequence(input);
  assert.equal(result.length, 30); assert(result.every(f => f.length === 258));
  assert.deepEqual(result[0], Array.from(input[0])); assert.deepEqual(result[29], Array.from(input.at(-1)));
  for (const invalid of [[], [input[0]]]) assert.throws(() => resampleSequence(invalid));
  assert.throws(() => resampleSequence(input, 1));
  assert.throws(() => normalizeKeypoints(new Array(1692).fill(0)));
  assert.throws(() => normalizeKeypoints(new Array(258).fill(NaN)));
  assert.throws(() => buildRawFeatures(pose.slice(1), hands));
  assert.throws(() => extractKeypoints(null, {landmarks: [hands[0].landmarks], handednesses: []}));
});
