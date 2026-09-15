with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

# Add lastVideoTimeRef
content = content.replace('  const isCancelledRef = useRef(false);', 
'''  const isCancelledRef = useRef(false);
  const lastVideoTimeRef = useRef(0);''')

# Replace the MediaPipe invocation logic
old_logic = '''      // Skeleton overlay
      if (video.videoWidth > 0 && landmarkersRef.current) {
        const { pose, hand } = landmarkersRef.current;
        const pRes = pose.detectForVideo(video, performance.now());
        const hRes = hand.detectForVideo(video, performance.now());
        const fRes = landmarkersRef.current.face ? landmarkersRef.current.face.detectForVideo(video, performance.now()) : null;
        drawOverlay(pRes, hRes, fRes);
      }
      animationId = requestAnimationFrame(predictLoop);
    };
    
    video.onloadeddata = () => {
      animationId = requestAnimationFrame(predictLoop);
    };'''

new_logic = '''      // Skeleton overlay
      if (video.readyState >= 2 && video.videoWidth > 0 && landmarkersRef.current && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          const { pose, hand, face } = landmarkersRef.current;
          const now = performance.now();
          const pRes = pose.detectForVideo(video, now);
          const hRes = hand.detectForVideo(video, now);
          const fRes = face ? face.detectForVideo(video, now) : null;
          drawOverlay(pRes, hRes, fRes);
        } catch (e) {
          console.error("MediaPipe detection error:", e);
        }
      }
      animationId = requestAnimationFrame(predictLoop);
    };
    
    video.onloadeddata = () => {
      if (!animationId) {
        animationId = requestAnimationFrame(predictLoop);
      }
    };
    if (video.readyState >= 1 && !animationId) {
      animationId = requestAnimationFrame(predictLoop);
    }'''

content = content.replace(old_logic, new_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode loop fixed!")
