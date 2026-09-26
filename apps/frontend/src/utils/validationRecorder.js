import {decidePrediction, INFERENCE} from './recognition.js';
export const UNKNOWN_TRIAL = '__unknown__';
export function createTrial({target, notes, sequence, frames, observations, scores, labels, thresholds=INFERENCE}) {
  if (!labels.includes(target) && target !== UNKNOWN_TRIAL) throw new Error('Select an intended sign');
  if (sequence.length !== 30 || sequence.some(f=>f.length!==258 || !Array.from(f).every(Number.isFinite))) throw new Error('Invalid trial sequence');
  if (!frames.length || observations.length!==frames.length || observations.some(o=>!o)) throw new Error('Missing frame observations');
  const {ranked,accepted}=decidePrediction(scores,labels,thresholds);
  const coverage=key=>observations.filter(o=>o[key]).length/observations.length;
  return {id:crypto.randomUUID(),completedAt:new Date().toISOString(),intendedLabel:target,notes,
    schema:'sanket-258-v1',preprocessing:'nose-xy-shoulder-v1',temporal:'frame-linear-30-v1',
    inputMirrored:false,previewMirrored:true,sourceFrameCount:frames.length,
    frameTimesMs:observations.map(o=>o.time),coverage:{pose:coverage('pose'),left:coverage('left'),right:coverage('right')},
    sequence:sequence.map(f=>Array.from(f)),scores:Array.from(scores),thresholds:{...thresholds},
    top3:ranked.slice(0,3),margin:ranked[0].score-(ranked[1]?.score ?? 0),accepted,
    correct:target===UNKNOWN_TRIAL ? !accepted : accepted && ranked[0].action===target};
}
