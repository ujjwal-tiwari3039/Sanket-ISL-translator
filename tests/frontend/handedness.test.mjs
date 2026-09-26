import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRawFeatures} from '../../apps/frontend/src/utils/features.js';
const points=value=>Array.from({length:21},()=>({x:value,y:value,z:value}));
test('detector category slots: left-only, right-only, both and reordered',()=>{
 const left={label:'Left',landmarks:points(.25)},right={label:'Right',landmarks:points(.75)};
 const l=buildRawFeatures(null,[left]),r=buildRawFeatures(null,[right]);
 assert(l.slice(132,195).every(v=>v===.25));assert(l.slice(195).every(v=>v===0));
 assert(r.slice(132,195).every(v=>v===0));assert(r.slice(195).every(v=>v===.75));
 assert.deepEqual(buildRawFeatures(null,[left,right]),buildRawFeatures(null,[right,left]));
});
test('unknown and ambiguous categories never populate a semantic slot',()=>{
 assert(buildRawFeatures(null,[{label:'Unknown',landmarks:points(.5)}]).every(v=>v===0));
 assert(buildRawFeatures(null,[{label:'Left',landmarks:points(.25)},{label:'Left',landmarks:points(.75)}]).every(v=>v===0));
});
