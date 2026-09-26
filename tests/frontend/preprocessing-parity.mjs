import fs from 'node:fs';
import { buildRawFeatures, extractKeypoints } from '../../apps/frontend/src/utils/features.js';
import { resampleSequence } from '../../apps/frontend/src/utils/resampling.js';

const { frames } = JSON.parse(fs.readFileSync(0, 'utf8'));
const raw = frames.map(f => Array.from(buildRawFeatures(f.pose, f.hands)));
// Exercise the adapter used by App, not a second test-only normalizer.
const normalized = frames.map(f => extractKeypoints(
  {landmarks: f.pose ? [f.pose] : []},
  {landmarks: f.hands.map(h => h.landmarks), handednesses: f.hands.map(h => [{categoryName: h.label}])},
));
process.stdout.write(JSON.stringify({raw, normalized, sequence: resampleSequence(normalized)}));
