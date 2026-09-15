with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

old_logic = '''        if (time >= start && time < end) {
          activeWord = w;
          const progress = Math.min(100, Math.floor(((time - start) / 1.5) * 100));
          setStrokeStatus("RECORDING");
          setRecordingProgress(progress);
          setCurrentSign("Capturing sign...");
          break;
        } else if (time >= end && time < end + 1.0) {
          // Evaluation phase (1 sec)
          activeWord = w;
          setStrokeStatus("COOLDOWN");
          setRecordingProgress(100);
          setConfidence(w.confidence * 100);
          setCurrentSign(w.word.toUpperCase());
          if (!processedWordsRef.current.has(i)) {
             processedWordsRef.current.add(i);
             setSentence(prev => {
                const ns = [...prev, w.word.toUpperCase()];
                return ns.length > 5 ? ns.slice(ns.length - 5) : ns;
             });
          }
          break;
        }'''

new_logic = '''        if (time >= start && time < end && !video.ended) {
          activeWord = w;
          const progress = Math.min(100, Math.floor(((time - start) / 1.5) * 100));
          setStrokeStatus("RECORDING");
          setRecordingProgress(progress);
          setCurrentSign("Capturing sign...");
          break;
        } else if ((time >= end || video.ended) && !processedWordsRef.current.has(i)) {
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

content = content.replace(old_logic, new_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode sequence logic fixed!")
