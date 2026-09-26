import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial,UNKNOWN_TRIAL} from '../../apps/frontend/src/utils/validationRecorder.js';
const args=()=>({target:'shirt',notes:'bright',sequence:Array.from({length:30},()=>Array(258).fill(0)),frames:[[],[]],
 observations:[{time:10,pose:true,left:true,right:false},{time:76,pose:true,left:false,right:true}],scores:[.8,.2],labels:['shirt','shoes']});
test('retains exact model input, full scores and source detection coverage',()=>{
 const a=args(),r=createTrial(a);assert.equal(r.correct,true);assert.equal(r.accepted,true);
 assert.deepEqual(r.coverage,{pose:1,left:.5,right:.5});assert.deepEqual(r.frameTimesMs,[10,76]);
 assert.deepEqual(r.scores,a.scores);assert.deepEqual(r.sequence,a.sequence);
 a.sequence[0][0]=12;assert.equal(r.sequence[0][0],0);
});
test('unknown acceptance and known rejection are not successes',()=>{
 assert.equal(createTrial({...args(),target:UNKNOWN_TRIAL}).correct,false);
 assert.equal(createTrial({...args(),thresholds:{confidence:.9,margin:0}}).correct,false);
 assert.equal(createTrial({...args(),target:UNKNOWN_TRIAL,thresholds:{confidence:.9,margin:0}}).correct,true);
});
test('malformed or unlabeled captures fail explicitly',()=>{
 assert.throws(()=>createTrial({...args(),target:''}));
 assert.throws(()=>createTrial({...args(),sequence:[]}));
 assert.throws(()=>createTrial({...args(),observations:[undefined,undefined]}));
});
