import re

with open("frontend/src/App.jsx", "r") as f:
    content = f.read()

idle_pattern = re.compile(r"            \} else if \(strokeStateRef\.current === \"IDLE\"\) \{.*?            \} else if \(strokeStateRef\.current === \"RECORDING\"\) \{", re.DOTALL)

new_idle = """            } else if (strokeStateRef.current === "IDLE") {
              // Always maintain a rolling pre-buffer of low-velocity wind-up frames
              preStrokeBufferRef.current.push(keypoints);
              if (preStrokeBufferRef.current.length > PRE_PAD_FRAMES) {
                preStrokeBufferRef.current.shift();
              }
              
              // Maintain a hidden 30-frame buffer just for static evaluation
              if (!window.staticFrameBuffer) window.staticFrameBuffer = [];
              window.staticFrameBuffer.push(keypoints);
              if (window.staticFrameBuffer.length > sequenceLength) {
                 window.staticFrameBuffer.shift();
              }

              if (activeHands.length > 0) {
                // 1. Start trigger: motion initiation above start threshold
                if (handVelocity >= 0.038) {
                  strokeStateRef.current = "RECORDING";
                  strokeFramesRef.current = [...preStrokeBufferRef.current];
                  lowVelocityFramesRef.current = 0;
                  postPadFramesRemainingRef.current = 0;
                  strokeQuestionRef.current = questionFlag;
                  setStrokeStatus("RECORDING");
                  setIsStrokeCapturing(true);
                  setCurrentSign("Capturing sign...");
                  setRecordingProgress(10);
                  setUiState("RECORDING");
                  window.staticHoldFrames = 0;
                } else if (handVelocity < 0.018) {
                  // Static Sign Tracking
                  window.staticHoldFrames = (window.staticHoldFrames || 0) + 1;
                  if (window.staticHoldFrames >= 20) {
                     // 20 frames of stillness -> Evaluate Static Sign
                     // Pad if needed, though resampleSequence handles it
                     strokeFramesRef.current = [...window.staticFrameBuffer];
                     strokeQuestionRef.current = questionFlag;
                     evaluateStroke();
                     window.staticHoldFrames = 0;
                     window.staticFrameBuffer = [];
                  }
                } else {
                  window.staticHoldFrames = 0;
                }
              } else {
                window.staticHoldFrames = 0;
                window.staticFrameBuffer = [];
              }
            } else if (strokeStateRef.current === "RECORDING") {"""

content = idle_pattern.sub(new_idle, content)

with open("frontend/src/App.jsx", "w") as f:
    f.write(content)

print("IDLE patched")
