// Isolated Chromium CDP on 9223; no automation dependency or physical camera.
import fs from 'node:fs';
const out=process.argv[2] || '/tmp/sanket-visual-qa';fs.mkdirSync(out,{recursive:true});
const page=await (await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
await send('Runtime.enable');await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.qaLCP=0;new PerformanceObserver(l=>{window.qaLCP=l.getEntries().at(-1)?.startTime || 0}).observe({type:'largest-contentful-paint',buffered:true});window.qaCLS=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.qaCLS+=e.value}).observe({type:'layout-shift',buffered:true});`});
const results=[];
for(const width of [1440,768,390,320]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:process.env.QA_URL || 'http://127.0.0.1:5173/'});
 await new Promise(r=>setTimeout(r,2000));
 if(process.env.QA_THEME) await evaluate(`(()=>{if(document.documentElement.dataset.theme!==${JSON.stringify(process.env.QA_THEME)})document.querySelector('[data-theme-toggle]')?.click();})()`);
 const info=await evaluate(`({theme:document.documentElement.dataset.theme,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,cls:window.qaCLS,lcp:window.qaLCP,h1:document.querySelectorAll('h1').length,buttons:[...document.querySelectorAll('button')].map(b=>b.textContent.trim()),resources:performance.getEntriesByType('resource').map(r=>({name:r.name,bytes:r.transferSize})),load:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd})`);
 results.push(info);
 if(width===1440) results.push({idleFrameTiming:await evaluate(`new Promise(resolve=>{const times=[];let frameId;const timeout=setTimeout(()=>{cancelAnimationFrame(frameId);resolve({frames:Math.max(0,times.length-1),averageMs:null,status:'incomplete/background-throttled'});},2500);function frame(t){times.push(t);if(times.length<61)frameId=requestAnimationFrame(frame);else {clearTimeout(timeout);resolve({frames:60,averageMs:(times[60]-times[0])/60});}}frameId=requestAnimationFrame(frame);})`)});
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(`${out}/${width}.png`,Buffer.from(shot.data,'base64'));
}
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
results.push({reducedMotion:await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),errors});
if(process.env.QA_INTERACTIONS==='1'){
 const base=new URL('/translate/',process.env.QA_URL || 'http://127.0.0.1:5173/').href;
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const click=label=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes(${JSON.stringify(label)}))?.click()`);
 const screenshot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(`${out}/${name}.png`,Buffer.from(shot.data,'base64'));};
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base});await pause(1000);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 results.push({keyboardFocus:await evaluate('document.activeElement.className')});
 await click('Start live translation');await pause(200);
 await evaluate(`document.querySelector('#translator').scrollIntoView()`);await screenshot('loading');
 for(let i=0;i<45;i++){if(await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Record Next Sign')&&!b.disabled)`))break;await pause(1000);}
 results.push({liveReady:await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Record Next Sign')&&!b.disabled)`)});
 await evaluate(`(()=>{const input=document.querySelector('input[type=text]');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Ujjwal');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await pause(100);await click('Spell Name');await screenshot('live-desktop');
 results.push({nameAdded:await evaluate(`document.querySelector('.sequence-text').textContent.includes('UJJWAL')`)});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:false});await pause(200);await screenshot('live-mobile');
 results.push({liveMobileOverflow:await evaluate('document.documentElement.scrollWidth>innerWidth')});
 if(await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Enter Demo'))`)){await click('Enter Demo');await pause(1000);await screenshot('demo-mobile');results.push({demoLabel:await evaluate(`document.body.innerText.includes('Scripted presentation')`)});}else{results.push({productionDemo:'local setup only, by publication policy'});}
 await click('Close workspace');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied for QA','NotAllowedError')}`});
 await send('Page.navigate',{url:base});await pause(800);await click('Start live translation');await pause(3000);await screenshot('camera-error');
 results.push({cameraError:await evaluate(`document.body.innerText.includes('CAMERA UNAVAILABLE')`)});
 await send('Page.navigate',{url:new URL('/docs/architecture/',base).href});await pause(500);await screenshot('documentation-mobile');
 results.push({docsOverflow:await evaluate('document.documentElement.scrollWidth>innerWidth')});
}
fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({resources,...r})=>r),null,2));ws.close();
