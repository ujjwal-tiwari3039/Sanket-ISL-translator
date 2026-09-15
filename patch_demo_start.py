with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

# Replace the video start logic and predictLoop scheduling
old_logic = '''    video.src = `/demo/videos/${encodeURIComponent(entry.video)}`;
    video.play().catch(e => console.error("Video play error:", e));
    
    processedWordsRef.current = new Set();'''

new_logic = '''    video.src = `/demo/videos/${encodeURIComponent(entry.video)}`;
    video.load();
    video.play().catch(e => console.error("Video play error:", e));
    
    processedWordsRef.current = new Set();'''
content = content.replace(old_logic, new_logic)

old_loop_logic = '''      animationId = requestAnimationFrame(predictLoop);
    };
    
    video.onloadeddata = () => {
      if (!animationId) {
        animationId = requestAnimationFrame(predictLoop);
      }
    };
    if (video.readyState >= 1 && !animationId) {
      animationId = requestAnimationFrame(predictLoop);
    }'''

new_loop_logic = '''      animationId = requestAnimationFrame(predictLoop);
    };
    
    // Start loop immediately, it will safely wait for readyState >= 2
    animationId = requestAnimationFrame(predictLoop);'''
content = content.replace(old_loop_logic, new_loop_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode start logic fixed!")
