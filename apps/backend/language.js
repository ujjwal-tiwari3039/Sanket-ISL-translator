const labels = require('../../models/labels.json');
const vocabulary = new Set([...Object.values(labels).map(s => s.toLowerCase()), 'i', 'a', 'my', 'name', 'is', 'am', 'are', 'you', 'we', 'they']);

function validateSequence(sequence) {
  if (!Array.isArray(sequence) || sequence.length < 1 || sequence.length > 64) throw new Error('Expected 1–64 tokens');
  return sequence.map(token => {
    if (typeof token === 'string') {
      const clean = token.trim();
      if (clean.length > 80 || !/^[A-Za-z0-9][A-Za-z0-9 '()\-]*\??$/.test(clean)) throw new Error('Invalid gloss token');
      const bare = clean.replace(/\?$/, '');
      if (!vocabulary.has(bare.toLowerCase()) && !/^[A-Z]$/.test(bare)) throw new Error('Unknown gloss token');
      return clean;
    }
    if (!token || token.type !== 'fingerspell' || !['name','acronym'].includes(token.kind) ||
        !Array.isArray(token.letters) || token.letters.length < 1 || token.letters.length > 40 ||
        !token.letters.every(letter => typeof letter === 'string' && /^[A-Za-z]$/.test(letter))) {
      throw new Error('Invalid fingerspelling token');
    }
    return {type: 'fingerspell', kind: token.kind, letters: token.letters.map(s => s.toUpperCase())};
  });
}

function spell(letters, kind = 'name') {
  const word = letters.join('');
  return kind === 'acronym' ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1).toLowerCase();
}

function mergeFingerspelledLetters(sequence) {
  const result = [];
  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i];
    if (typeof item === 'object') {
      result.push(spell(item.letters, item.kind));
      continue;
    }
    // Legacy unambiguous alphabet runs remain supported. I/A are ordinary words;
    // explicit fingerspell tokens are required to disambiguate names starting there.
    if (/^[A-Z]$/.test(item) && item !== 'I' && item !== 'A') {
      const letters = [item];
      while (i + 1 < sequence.length && typeof sequence[i+1] === 'string' && /^[A-Z]$/.test(sequence[i+1])) letters.push(sequence[++i]);
      result.push(letters.length > 1 ? spell(letters) : item);
    } else result.push(item);
  }
  return result;
}

function fallbackSentence(words) {
  const question = words.some(w => w.endsWith('?')) || /^(who|what|where|when|why|how|can|is|are|am|do|does)$/i.test(words[0]);
  let text = words.map(w => w.replace(/\?$/, '')).join(' ');
  text = text.replace(/\bi\b/gi, 'I').replace(/^my name (?!is\b)/i, 'My name is ');
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return text + (question ? '?' : '.');
}

module.exports = {validateSequence, mergeFingerspelledLetters, fallbackSentence};
