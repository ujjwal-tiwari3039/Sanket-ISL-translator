with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

old_logic = '''      // UI Scripting
      let activeWord = null;
      for (let i = 0; i < entry.words.length; i++) {
        const w = entry.words[i];
        const duration = video.duration && !isNaN(video.duration) ? video.duration : 2.0;
        const targetTime = Math.min(w.timestamp, duration - 0.2); // Trigger slightly before video ends if short
        const start = Math.max(0, targetTime - 1.5);
        const end = targetTime;'''

new_logic = '''      // UI Scripting
      let activeWord = null;
      for (let i = 0; i < entry.words.length; i++) {
        const w = entry.words[i];
        const duration = video.duration && !isNaN(video.duration) ? video.duration : 2.0;
        
        // Evenly space the words across the video duration
        const timePerWord = duration / entry.words.length;
        const targetTime = (i + 1) * timePerWord - 0.1; 
        
        // Start capturing halfway through the previous word's time slot
        const start = Math.max(0, targetTime - (timePerWord * 0.8));
        const end = targetTime;'''

content = content.replace(old_logic, new_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode spacing logic fixed!")
