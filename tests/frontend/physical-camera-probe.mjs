// Read the actual App diagnostics, never inject a camera or synthetic landmarks.
// Run with the isolated visible Chromium debugging on 9224 and ?landmarkDebug.
const pages=await (await fetch('http://127.0.0.1:9224/json')).json();
const page=pages.find(p=>p.type==='page' && p.url.includes('landmarkDebug'));
if(!page) throw new Error('Open the actual frontend with ?landmarkDebug first');
const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
const timeout=setTimeout(()=>{ws.close();process.exitCode=1;},10000);
ws.addEventListener('message',({data})=>{
 const result=JSON.parse(data); if(result.id!==1)return;
 console.log(JSON.stringify(result.result?.result?.value ?? result,null,2));
 clearTimeout(timeout);ws.close();
});
ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{returnByValue:true,expression:`({
 camera:document.querySelector('video')?.srcObject?.getVideoTracks().map(t=>({label:t.label,state:t.readyState,settings:t.getSettings()})),
 diagnostic:document.querySelector('pre')?.textContent,
 state:document.body.innerText.slice(-2500)
})`}}));
