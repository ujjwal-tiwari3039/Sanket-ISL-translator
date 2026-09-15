with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

old_logic = '''        } else if ((time >= end || video.ended) && !processedWordsRef.current.has(i)) {
          // Evaluation phase (1 sec)
          activeWord = w;
          setStrokeStatus("COOLDOWN");
          setRecordingProgress(100);
          setConfidence(w.confidence * 100);
          setCurrentSign(w.word.toUpperCase());
          processedWordsRef.current.add(i);
          setSentence(prev => {
             const ns = [...prev, w.word.toUpperCase()];
             return ns.length > 5 ? ns.slice(ns.length - 5) : ns;
          });
          break;
        } else if (processedWordsRef.current.has(i) && (time < end + 1.0 || video.ended)) {
          activeWord = w;
          break;
        }'''

new_logic = '''        } else if ((time >= end || video.ended) && !processedWordsRef.current.has(i)) {
          activeWord = w;
          setStrokeStatus("COOLDOWN");
          setRecordingProgress(100);
          setConfidence(w.confidence * 100);
          setCurrentSign(w.word.toUpperCase());
          processedWordsRef.current.add(i);
          setSentence(prev => {
             const ns = [...prev, w.word.toUpperCase()];
             return ns.length > 5 ? ns.slice(ns.length - 5) : ns;
          });
          break;
        } else if (processedWordsRef.current.has(i)) {
          // We already processed this word. Check if the NEXT word should be starting.
          // If we are still before the next word's start time, hold the COOLDOWN state.
          const nextStart = (i + 1 < entry.words.length) ? (Math.max(0, ((i + 2) * timePerWord - 0.1) - (timePerWord * 0.8))) : 999;
          if (time < nextStart || video.ended) {
            activeWord = w;
            break;
          }
          // Otherwise, continue loop to let the next word take over
        }'''

content = content.replace(old_logic, new_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode cooldown logic fixed!")
