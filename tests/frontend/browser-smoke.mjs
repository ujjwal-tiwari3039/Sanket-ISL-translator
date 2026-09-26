// Requires Vite on 5173 and a synthetic-camera Chromium debugging endpoint on 9223.
import assert from 'node:assert/strict';
const page = (await (await fetch('http://127.0.0.1:9223/json')).json()).find(p=>p.type==='page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',event=>{
 const m=JSON.parse(event.data);
 if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}
 if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));
});
const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result?.value;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await send('Runtime.enable');await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.auditStreams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async (...args)=>{const stream=await original(...args);window.auditStreams.push(stream);return stream;};`});
await send('Page.navigate',{url:'http://127.0.0.1:5173/'});
let ready=false;
for(let i=0;i<60;i++){
 ready=await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Record Next Sign')&&!b.disabled)`);
 if(ready)break;await pause(1000);
}
console.log('Live ready:',ready);
if(!ready)console.log(await evaluate('document.body.innerText'));
assert(ready,'Model initialization failed');
assert.equal(await evaluate(`document.querySelector('video').srcObject.getVideoTracks()[0].readyState`),'live');
await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Enter Demo')).click()`);
await pause(1500);
assert(await evaluate(`document.body.innerText.includes('Scripted presentation')`));
assert(await evaluate(`window.auditStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))`),'Live camera survived demo switch');
await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Exit demo')).click()`);
ready=false;
for(let i=0;i<60;i++){
 ready=await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Record Next Sign')&&!b.disabled)`);
 if(ready)break;await pause(1000);
}
assert(ready,'Live restart failed');
assert.equal(await evaluate(`document.querySelector('video').srcObject.getVideoTracks()[0].readyState`),'live');
assert.deepEqual(errors,[]);
console.log('PASS: model loading, synthetic camera, demo isolation, live camera restart, no uncaught exceptions');
ws.close();
