import test from 'node:test';
import assert from 'node:assert/strict';
import {captureStopDecision,decidePrediction,validateLabels,inferenceConfig} from '../../apps/frontend/src/utils/recognition.js';
test('stop hysteresis respects minimum length, consecutive rest, manual mode and cap',()=>{
 assert.equal(captureStopDecision(19,0,9,true).postRecord,false);
 assert.equal(captureStopDecision(20,0,8,true).postRecord,false);
 assert.equal(captureStopDecision(20,0,9,true).postRecord,true);
 assert.equal(captureStopDecision(20,.1,9,true).lowFrames,0);
 assert.equal(captureStopDecision(40,0,20,false).postRecord,false);
 assert.equal(captureStopDecision(300,.1,0,false).evaluate,true);
});
test('uncertain, reserved classes, margins and bad tensors never emit a word',()=>{
 assert.equal(decidePrediction([.35,.34,.31],['hello','name','extra']).accepted,false);
 assert.equal(decidePrediction([.99,.01],['extra','hello']).accepted,false);
 assert.equal(decidePrediction([.55,.45],['hello','name'],{confidence:.4,margin:.2}).accepted,false);
 assert.equal(decidePrediction([.8,.2],['hello','name']).accepted,true);
 assert.throws(()=>decidePrediction([NaN],['hello']));
 assert.throws(()=>validateLabels({'1':'hello'},1));
 assert.throws(()=>validateLabels({'0':'hello','1':'hello'},2));
 assert.deepEqual(validateLabels({'0':'hello','1':'name'},2),['hello','name']);
});

test('configuration and exact confidence boundary',()=>{
 assert.deepEqual(inferenceConfig(),{confidence:.4,margin:0});
 assert.deepEqual(inferenceConfig({VITE_INFERENCE_CONFIDENCE:'.7',VITE_INFERENCE_MARGIN:'.2'}),{confidence:.7,margin:.2});
 assert.throws(()=>inferenceConfig({VITE_INFERENCE_CONFIDENCE:'invalid'}));
 assert.equal(decidePrediction([.4,.3,.3],['hello','name','extra']).accepted,false);
});
