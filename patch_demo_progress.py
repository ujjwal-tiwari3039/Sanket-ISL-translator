with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

old_logic = '''        if (time >= start && time < end && !video.ended) {
          activeWord = w;
          const progress = Math.min(100, Math.floor(((time - start) / 1.5) * 100));
          setStrokeStatus("RECORDING");'''

new_logic = '''        if (time >= start && time < end && !video.ended) {
          activeWord = w;
          const progress = Math.min(100, Math.floor(((time - start) / (end - start || 1)) * 100));
          setStrokeStatus("RECORDING");'''

content = content.replace(old_logic, new_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode progress logic fixed!")
