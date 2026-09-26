const fs = require('fs');

async function main() {
  const manifestPath = require('path').join(__dirname, '../../apps/frontend/public/demo/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    if (entry.words.length === 0) continue;
    
    const sequence = entry.words.map(w => w.word);
    console.log(`Fetching sentence for: ${sequence.join(', ')}`);
    
    try {
      const response = await fetch('http://localhost:3001/api/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence })
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let sentence = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sentence += decoder.decode(value, { stream: true });
      }
      
      console.log(`-> ${sentence}`);
      entry.sentence = sentence;
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Updated manifest.json with sentences!");
}

main();
