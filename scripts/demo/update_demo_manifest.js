const fs = require('fs');
const path = require('path');

const videosDir = path.join(__dirname, '../../apps/frontend/public', 'demo', 'videos');
const manifestPath = path.join(__dirname, '../../apps/frontend/public', 'demo', 'manifest.json');

if (!fs.existsSync(videosDir)) {
  console.log('Creating demo videos directory...');
  fs.mkdirSync(videosDir, { recursive: true });
}

const files = fs.readdirSync(videosDir)
  .filter(f => f.toLowerCase().endsWith('.mp4') || f.toLowerCase().endsWith('.mov'))
  .sort((a, b) => {
    const aIsTest = a.includes('_MVI_');
    const bIsTest = b.includes('_MVI_');
    if (aIsTest && !bIsTest) return 1;
    if (!aIsTest && bIsTest) return -1;
    return a.localeCompare(b);
  });

const manifest = [];

function generateMockSentence(word) {
  let w = word.trim();
  const lower = w.toLowerCase();
  if (lower === 'hello' || lower === 'hi') return 'Hello, how are you?';
  if (lower === 'deaf') return 'I am deaf.';
  if (lower === 'happy') return 'I am feeling happy today.';
  if (lower === 'thank you' || lower === 'thanks') return 'Thank you so much.';
  
  let sentence = w.charAt(0).toUpperCase() + w.slice(1);
  sentence = sentence.replace(/\bi\b/g, 'I');
  
  const firstWord = sentence.split(' ')[0].toLowerCase();
  const qWords = ['am', 'are', 'is', 'how', 'what', 'where', 'why', 'who', 'when', 'do', 'does', 'can', 'could'];
  if (qWords.includes(firstWord)) {
    sentence += '?';
  } else {
    sentence += '.';
  }
  return sentence;
}

for (const file of files) {
  const ext = path.extname(file);
  let baseName = path.basename(file, ext);
  
  if (baseName.includes('_MVI_')) {
    baseName = baseName.split('_MVI_')[0];
  }
  
  const cleanName = baseName.replace(/_/g, ' ');
  const rawWords = cleanName.split(' ').filter(w => w.trim().length > 0);
  
  // Expand names into fingerspelled letter tokens
  const wordsList = [];
  for (let i = 0; i < rawWords.length; i++) {
    const rw = rawWords[i];
    // If it's a hyphenated spelled sequence like 'u-j-j-w-a-l'
    if (rw.includes('-')) {
      const chars = rw.split('-').filter(Boolean);
      for (const c of chars) wordsList.push(c.toUpperCase());
    } else if (i > 0 && (rawWords[i - 1].toLowerCase() === 'is' || rawWords[i - 1].toLowerCase() === 'name') && i === rawWords.length - 1 && rw.length >= 2) {
      // It is a proper name at the end of 'name is ...' -> Fingerspell each letter
      for (const c of rw) wordsList.push(c.toUpperCase());
    } else {
      wordsList.push(rw);
    }
  }
  
  const wordsObjects = [];
  
  // We don't know the exact duration of the video in this Node script easily without ffprobe.
  // But we can just assign timestamps 1.0, 2.0, 3.0 etc.
  // Wait! In DemoMode.jsx, we dynamically scale the triggers if the video is shorter than the timestamp!
  // If we just assign 1.0, 2.0, 3.0, and the video is 1.5 seconds long, DemoMode.jsx currently clamps the trigger to (duration - 0.2).
  // But if there are MULTIPLE words, clamping them all to duration-0.2 will make them all trigger at the exact same time at the end!
  // We need DemoMode.jsx to know they are spaced out, OR we just assume standard pacing: 1 sign per 1.5 seconds.
  
  // Let's just generate evenly spaced timestamps starting at 1.0s, incrementing by 1.2s
  let currentTimestamp = 1.0;
  for (let i = 0; i < wordsList.length; i++) {
    wordsObjects.push({
      word: wordsList[i],
      timestamp: currentTimestamp,
      confidence: null, // Scripted words have no classifier confidence.
      origin: 'scripted'
    });
    currentTimestamp += 1.2;
  }
  
  manifest.push({
    video: file,
    words: wordsObjects,
    sentence: generateMockSentence(cleanName)
  });
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`✅ Demo manifest generated successfully with ${manifest.length} videos!`);
