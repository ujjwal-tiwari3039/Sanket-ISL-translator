with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

# Find the start of predictLoop
old_logic = '''      // UI Scripting
      let activeWord = null;'''

new_logic = '''      setDebugStr(`Time: ${video.currentTime.toFixed(2)} | RS: ${video.readyState} | Ended: ${video.ended} | W: ${video.videoWidth}`);
      // UI Scripting
      let activeWord = null;'''

content = content.replace(old_logic, new_logic)

# Show it in the UI
old_ui = '''          <div className="info-text">
            <span>[DEBUG] Playing demo {currentIndex + 1} of {manifest.length}</span>'''

new_ui = '''          <div className="info-text">
            <span>[DEBUG] {currentIndex + 1}/{manifest.length} | {debugStr}</span>'''

content = content.replace(old_ui, new_ui)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("Debug UI added!")
