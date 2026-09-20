import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker, HandLandmarker, FaceLandmarker } from '@mediapipe/tasks-vision';

export default function DemoMode({ onExit }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [manifest, setManifest] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [currentSign, setCurrentSign] = useState("Waiting...");
  const [confidence, setConfidence] = useState(0);
  const [sentence, setSentence] = useState([]);
  const [llmSentence, setLlmSentence] = useState("...");
  const [strokeStatus, setStrokeStatus] = useState("IDLE");
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [showFaceMesh, setShowFaceMesh] = useState(true);
  const [debugStr, setDebugStr] = useState("Init...");
  const smoothedFaceRef = useRef(null);
  const smoothedHandsRef = useRef([]);
  
  const landmarkersRef = useRef(null);
  const isCancelledRef = useRef(false);
  const lastVideoTimeRef = useRef(0);
  
  useEffect(() => {
    isCancelledRef.current = false;
    
    fetch('/demo/manifest.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => setManifest(data))
      .catch(err => console.error("Could not load demo manifest", err));
      
    const loadModels = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const pose = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" },
          runningMode: "VIDEO"
        });
        const hand = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" },
          runningMode: "VIDEO", numHands: 2
        });
        const face = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          runningMode: "VIDEO"
        });
        landmarkersRef.current = { pose, hand, face };
        setModelsLoaded(true);
      } catch(e) {
        console.error(e);
      }
    };
    loadModels();
    
    return () => { isCancelledRef.current = true; };
  }, []);
  
  // Scripted Timeline Logic
  const processedWordsRef = useRef(new Set());
  const sentenceTriggeredRef = useRef(false);
  
  useEffect(() => {
    if (!manifest[currentIndex] || !modelsLoaded) return;
    
    const entry = manifest[currentIndex];
    const video = videoRef.current;
    if (!video) return;
    
    video.src = `/demo/videos/${encodeURIComponent(entry.video)}`;
    video.load();
    video.play().catch(e => console.error("Video play error:", e));
    
    processedWordsRef.current = new Set();
    sentenceTriggeredRef.current = false;
    setSentence([]);
    setLlmSentence("...");
    setCurrentSign("Waiting...");
    setStrokeStatus("IDLE");
    setRecordingProgress(0);
    setConfidence(0);
    
    let animationId;
    
    const predictLoop = () => {
      const time = video.currentTime;
      
      setDebugStr(`Time: ${video.currentTime.toFixed(2)} | RS: ${video.readyState} | Ended: ${video.ended} | W: ${video.videoWidth}`);
      // UI Scripting
      let activeWord = null;
      for (let i = 0; i < entry.words.length; i++) {
        const w = entry.words[i];
        const duration = video.duration && !isNaN(video.duration) ? video.duration : 2.0;
        
        // Evenly space the words across the video duration
        const timePerWord = duration / entry.words.length;
        const targetTime = (i + 1) * timePerWord - 0.1; 
        
        // Start capturing halfway through the previous word's time slot
        const start = Math.max(0, targetTime - (timePerWord * 0.8));
        const end = targetTime;
        
        if (time >= start && time < end && !video.ended) {
          activeWord = w;
          const progress = Math.min(100, Math.floor(((time - start) / (end - start || 1)) * 100));
          setStrokeStatus("RECORDING");
          setRecordingProgress(progress);
          setCurrentSign("Capturing sign...");
          break;
        } else if ((time >= end || video.ended) && !processedWordsRef.current.has(i)) {
          activeWord = w;
          setStrokeStatus("COOLDOWN");
          setRecordingProgress(100);
          setConfidence(w.confidence * 100);
          setCurrentSign(w.word.toUpperCase());
          processedWordsRef.current.add(i);
          setSentence(prev => {
             const ns = [...prev, w.word.toUpperCase()];
             return ns.length > 15 ? ns.slice(ns.length - 15) : ns;
          });
          break;
        } else if (processedWordsRef.current.has(i)) {
          // We already processed this word. Check if the NEXT word should be starting.
          // If we are still before the next word's start time, hold the COOLDOWN state.
          const nextStart = (i + 1 < entry.words.length) ? (Math.max(0, ((i + 2) * timePerWord - 0.1) - (timePerWord * 0.8))) : 999;
          if (time < nextStart || (video.ended && i === entry.words.length - 1)) {
            activeWord = w;
            break;
          }
          // Otherwise, continue loop to let the next word take over
        }
      }
      
      if (!activeWord) {
        setStrokeStatus("IDLE");
        setRecordingProgress(0);
        setCurrentSign(video.ended ? "Idle" : "Waiting...");
      }
      
      if (video.ended && !sentenceTriggeredRef.current && entry.sentence) {
        sentenceTriggeredRef.current = true;
        // Simulate typing effect
        let txt = "";
        let i = 0;
        const type = () => {
          if (i < entry.sentence.length) {
            txt += entry.sentence.charAt(i);
            setLlmSentence(txt);
            i++;
            setTimeout(type, 30);
          }
        };
        type();
      }
      
      // Skeleton overlay
      // Force it to draw as long as we have a video frame
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
      }
      animationId = requestAnimationFrame(predictLoop);
    };
    
    // Start loop immediately, it will safely wait for readyState >= 2
    animationId = requestAnimationFrame(predictLoop);
    
    return () => cancelAnimationFrame(animationId);
  }, [currentIndex, manifest, modelsLoaded]);

    const drawOverlay = (poseRes, handRes, faceRes) => {
      const video = videoRef.current;
      if (!canvasRef.current || !video) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const w = video.videoWidth || canvas.clientWidth || 640;
      const h = video.videoHeight || canvas.clientHeight || 480;
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alpha = 0.65; // Temporal exponential moving average factor

      // 1. Pose Skeleton (Torso, Shoulders, Arms, Wrists)
      if (poseRes && poseRes.landmarks && poseRes.landmarks.length > 0) {
        const poseLm = poseRes.landmarks[0];
        const poseLines = [
          [11, 12], // shoulders
          [11, 13], [13, 15], // left arm
          [12, 14], [14, 16], // right arm
          [11, 23], [12, 24], // torso sides
          [23, 24]  // hips
        ];

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)'; // Bright cyber cyan
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (const [i, j] of poseLines) {
          const p1 = poseLm[i];
          const p2 = poseLm[j];
          if (p1 && p2 && (p1.visibility ?? 1) > 0.3 && (p2.visibility ?? 1) > 0.3) {
            ctx.moveTo(p1.x * w, p1.y * h);
            ctx.lineTo(p2.x * w, p2.y * h);
          }
        }
        ctx.stroke();

        // Joint points
        for (const idx of [11, 12, 13, 14, 15, 16, 23, 24]) {
          const pt = poseLm[idx];
          if (pt && (pt.visibility ?? 1) > 0.3) {
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(pt.x * w, pt.y * h, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
      
      // 2. Face Mesh & Key Facial Anchors
      if (faceRes && faceRes.faceLandmarks && faceRes.faceLandmarks.length > 0) {
        const rawFace = faceRes.faceLandmarks[0];
        if (!smoothedFaceRef.current || smoothedFaceRef.current.length !== rawFace.length) {
          smoothedFaceRef.current = rawFace.map(pt => ({ x: pt.x, y: pt.y, z: pt.z }));
        } else {
          smoothedFaceRef.current = smoothedFaceRef.current.map((prev, i) => ({
            x: alpha * rawFace[i].x + (1 - alpha) * prev.x,
            y: alpha * rawFace[i].y + (1 - alpha) * prev.y,
            z: alpha * rawFace[i].z + (1 - alpha) * prev.z
          }));
        }

        // Always draw subtle facial landmarks (brows, eyes, nose, lips)
        const keyFacePoints = [
          70, 63, 105, 66, 107, 336, 296, 334, 293, 300,
          33, 133, 159, 145, 362, 263, 386, 374,
          1, 2, 98, 327, 0, 13, 14, 17, 61, 291
        ];
        ctx.fillStyle = 'rgba(147, 197, 253, 0.6)';
        for (const idx of keyFacePoints) {
          const pt = smoothedFaceRef.current[idx];
          if (pt) {
            ctx.beginPath();
            ctx.arc(pt.x * w, pt.y * h, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }

        // Full Face Mesh (if enabled)
        if (showFaceMesh) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          for (let i = 0; i < smoothedFaceRef.current.length; i += 2) {
            const pt = smoothedFaceRef.current[i];
            ctx.rect(pt.x * w, pt.y * h, 1.5, 1.5);
          }
          ctx.fill();
        }
      } else {
        smoothedFaceRef.current = null;
      }
      
      // 3. Dual-Hand Temporal Smoothing + Priority 1 Grace Period
      const prevHands = smoothedHandsRef.current || [];
      const nextHands = [];
      const detectedHandLandmarks = (handRes && handRes.landmarks) ? handRes.landmarks : [];
      const handednesses = (handRes && handRes.handednesses) ? handRes.handednesses : [];

      const matchedPrevIndices = new Set();

      detectedHandLandmarks.forEach((rawPoints, dIdx) => {
        const hLabel = handednesses[dIdx]?.[0]?.categoryName || `Hand_${dIdx}`;
        const score = handednesses[dIdx]?.[0]?.score || 0.8;

        // Match with existing hand of same label or nearest index
        let prevMatchIdx = prevHands.findIndex((ph, pIdx) => !matchedPrevIndices.has(pIdx) && ph.label === hLabel);
        if (prevMatchIdx === -1) {
          prevMatchIdx = prevHands.findIndex((ph, pIdx) => !matchedPrevIndices.has(pIdx));
        }

        let smoothedPoints;
        if (prevMatchIdx !== -1) {
          matchedPrevIndices.add(prevMatchIdx);
          const prevPoints = prevHands[prevMatchIdx].landmarks;
          smoothedPoints = rawPoints.map((curr, pIdx) => ({
            x: alpha * curr.x + (1 - alpha) * (prevPoints[pIdx]?.x ?? curr.x),
            y: alpha * curr.y + (1 - alpha) * (prevPoints[pIdx]?.y ?? curr.y),
            z: alpha * curr.z + (1 - alpha) * (prevPoints[pIdx]?.z ?? curr.z)
          }));
        } else {
          smoothedPoints = rawPoints.map(curr => ({ x: curr.x, y: curr.y, z: curr.z }));
        }

        nextHands.push({
          label: hLabel,
          landmarks: smoothedPoints,
          missedFrames: 0,
          score: score
        });
      });

      // Grace period: Carry forward temporarily dropped hands for up to 3 frames
      prevHands.forEach((ph, pIdx) => {
        if (!matchedPrevIndices.has(pIdx) && ph.missedFrames < 3) {
          nextHands.push({
            label: ph.label,
            landmarks: ph.landmarks,
            missedFrames: ph.missedFrames + 1,
            score: ph.score * 0.8
          });
        }
      });

      smoothedHandsRef.current = nextHands;

      // Draw smoothed hand skeleton with grace-period fade
      const connections = {
        palm: [[0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17]],
        thumb: [[1, 2], [2, 3], [3, 4]],
        index: [[5, 6], [6, 7], [7, 8]],
        middle: [[9, 10], [10, 11], [11, 12]],
        ring: [[13, 14], [14, 15], [15, 16]],
        pinky: [[17, 18], [18, 19], [19, 20]]
      };
      const colors = {
        palm: '#9ca3af',
        thumb: '#ef4444',
        index: '#f59e0b',
        middle: '#10b981', 
        ring: '#3b82f6',
        pinky: '#8b5cf6'
      };

      nextHands.forEach(handData => {
        const landmarks = handData.landmarks;
        const opacity = Math.max(0.2, 1 - (handData.missedFrames * 0.3));
        
        ctx.globalAlpha = opacity;
        
        // Draw connections
        ctx.lineWidth = 2.5;
        for (const [part, color] of Object.entries(colors)) {
          ctx.strokeStyle = color;
          ctx.beginPath();
          connections[part].forEach(([i, j]) => {
            const p1 = landmarks[i];
            const p2 = landmarks[j];
            if (p1 && p2) {
              ctx.moveTo(p1.x * w, p1.y * h);
              ctx.lineTo(p2.x * w, p2.y * h);
            }
          });
          ctx.stroke();
        }

        // Draw points
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (const [part, color] of Object.entries(colors)) {
          connections[part].forEach(([i, j]) => {
            for (const idx of [i, j]) {
              const p = landmarks[idx];
              if (p) {
                ctx.beginPath();
                ctx.arc(p.x * w, p.y * h, 3, 0, 2 * Math.PI);
                ctx.fill();
                
                // Color ring around points
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p.x * w, p.y * h, 4.5, 0, 2 * Math.PI);
                ctx.stroke();
              }
            }
          });
        }
        ctx.globalAlpha = 1.0; // Reset
      });
    };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % manifest.length);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manifest.length]);

  const handleReplay = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play();
      processedWordsRef.current = new Set();
      sentenceTriggeredRef.current = false;
      setSentence([]);
      setLlmSentence("...");
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <h2>Sanket ISL Translator</h2>
          <p>Scripted presentation · words and confidence are prerecorded</p>
        </div>
        <div className={`ui-state-badge ACTIVE`}>
          <div className="ui-state-indicator"></div>
          ACTIVE
        </div>
        <button className="btn" onClick={onExit} style={{ marginLeft: 'auto' }}>Exit demo</button>
      </header>

      <main className="main-content">
        <section className="video-panel">
          <div className="video-container">
            <video 
              ref={videoRef}
              className="video-feed"
              autoPlay
              playsInline
              muted
              loop={false}
              style={{ transform: 'none' }} // Demo videos usually don't need CSS mirror if they are back-camera
            />
            <canvas ref={canvasRef} className="canvas-overlay" style={{ transform: 'none' }} />
          </div>
          <div className="info-text" style={{ visibility: 'hidden', height: '0', padding: '0' }}>
            <button id="nextDemoBtn" onClick={handleNext}>Next</button>
          </div>
        </section>

        <section className="controls-panel">
          <div className="data-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Sign Detection</h3>
              <span style={{ 
                fontSize: '0.75rem', fontFamily: 'JetBrains Mono', 
                color: strokeStatus === 'RECORDING' ? '#ef4444' : strokeStatus === 'COOLDOWN' ? '#10b981' : 'var(--text-muted)' 
              }}>
                {strokeStatus === 'RECORDING' ? `CAPTURING (${recordingProgress}%)` : strokeStatus === 'COOLDOWN' ? 'EVALUATED' : 'READY'}
              </span>
            </div>
            <div className="translation-text" style={{ color: strokeStatus === 'RECORDING' ? '#f59e0b' : 'var(--text-main)' }}>
              {currentSign}
            </div>
            <div className="gesture-progress-container">
              <div className={`gesture-progress-bar ${strokeStatus === 'RECORDING' ? 'recording' : ''}`} style={{ width: `${recordingProgress}%` }}></div>
            </div>
            <div className="confidence-bar-container">
              <div className="confidence-bar" style={{ width: `${confidence}%` }}></div>
            </div>
            <div className="conf-label">
              CONFIDENCE: {confidence.toFixed(1)}%
            </div>
          </div>

          <div className="data-panel">
             <h3>Sequence Context</h3>
             <div className="sequence-text">
               {sentence.length > 0 ? sentence.join(" → ") : "..."}
             </div>
          </div>

          <div className="data-panel llm-output">
            <h3>LLM Assembly</h3>
            <div className="llm-text">
              {llmSentence}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
