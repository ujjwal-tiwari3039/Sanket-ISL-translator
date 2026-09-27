import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../apps/frontend/public/theme.js',import.meta.url),'utf8');
function setup(saved, dark=false, denied=false){
 const events={},windowEvents={},media={matches:dark,addEventListener:(name,fn)=>{media.change=fn;}};
 const button={setAttribute:(k,v)=>{button[k]=v;}};
 const document={documentElement:{dataset:{}},querySelectorAll:()=>[button],addEventListener:(k,v)=>{events[k]=v;}};
 let stored=saved;
 const localStorage={getItem:()=>{if(denied)throw Error();return stored;},setItem:(k,v)=>{if(denied)throw Error();stored=v;}};
 vm.runInNewContext(source,{document,localStorage,window:{matchMedia:()=>media,addEventListener:(k,v)=>{windowEvents[k]=v;}}});
 return {document,button,media,windowEvents,click:()=>events.click({target:{closest:()=>button}}),saved:()=>stored};
}
test('system default, toggle persistence and explicit preference',()=>{
 const x=setup(null,true);assert.equal(x.document.documentElement.dataset.theme,'dark');
 x.click();assert.equal(x.saved(),'light');assert.equal(x.button['aria-label'],'Switch to dark mode');
 x.media.change();assert.equal(x.document.documentElement.dataset.theme,'light');
 assert.equal(setup(x.saved(),true).document.documentElement.dataset.theme,'light');
});
test('blocked storage, invalid preference and cross-tab updates',()=>{
 const x=setup('invalid',false,true);x.click();assert.equal(x.document.documentElement.dataset.theme,'dark');
 x.windowEvents.storage({key:'sanket-theme',newValue:'light'});assert.equal(x.document.documentElement.dataset.theme,'light');
 x.windowEvents.storage({key:'sanket-theme',newValue:null});x.media.matches=true;x.media.change();assert.equal(x.document.documentElement.dataset.theme,'dark');
});
