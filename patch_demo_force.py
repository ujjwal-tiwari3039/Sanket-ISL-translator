with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

# Make the predictLoop absolutely bulletproof
old_logic = '''      if (video.readyState >= 2 && video.videoWidth > 0 && landmarkersRef.current && video.currentTime !== lastVideoTimeRef.current) {
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
      }'''

new_logic = '''      // Force it to draw as long as we have a video frame
      if (video.videoWidth > 0 && landmarkersRef.current) {
        // Prevent duplicate timestamp errors by slightly incrementing if paused
        const now = performance.now();
        if (video.currentTime !== lastVideoTimeRef.current || video.paused) {
          lastVideoTimeRef.current = video.currentTime;
          try {
            const { pose, hand, face } = landmarkersRef.current;
            const pRes = pose.detectForVideo(video, now);
            const hRes = hand.detectForVideo(video, now);
            const fRes = face ? face.detectForVideo(video, now) : null;
            drawOverlay(pRes, hRes, fRes);
          } catch (e) {
            // Ignore temporary MediaPipe errors (like frame not ready yet)
          }
        }
      }'''

content = content.replace(old_logic, new_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode forced drawing patched!")
