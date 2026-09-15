import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { FilesetResolver, PoseLandmarker, HandLandmarker, FaceLandmarker } from '@mediapipe/tasks-vision';
import './index.css';

function App() {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // State for our dynamic translation
  const [currentSign, setCurrentSign] = useState("Waiting...");
  const [confidence, setConfidence] = useState(0);
  const [sentence, setSentence] = useState([]);
  const [llmSentence, setLlmSentence] = useState("...");
  const [isQuestion, setIsQuestion] = useState(false);
  const [debugInfo, setDebugInfo] = useState("Waiting for landmarks...");
  const [showFaceMesh, setShowFaceMesh] = useState(false);
  
  const [actionsList, setActionsList] = useState([]);
  const sequenceLength = 30;

  // Dynamic Stroke Capture states (Anti-Fluctuation)
  const [isStrokeMode, setIsStrokeMode] = useState(true);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [strokeStatus, setStrokeStatus] = useState("IDLE"); // IDLE, RECORDING, EVALUATING, COOLDOWN
  const [isStrokeCapturing, setIsStrokeCapturing] = useState(false);

  // Refs for logic loop & stroke engine
  const canvasRef = useRef(null);
  const sequenceRef = useRef([]);
  const sentenceRef = useRef([]);
  const tfModelRef = useRef(null);
  const landmarkersRef = useRef(null);
  const isPredictingRef = useRef(false);
  const smoothedHandsRef = useRef([]);
  const smoothedFaceRef = useRef(null);
  const isStrokeModeRef = useRef(true);
  const strokeFramesRef = useRef([]);
  const strokeStateRef = useRef("IDLE");
  const strokeCooldownRef = useRef(0);
  const lastHandLandmarksRef = useRef(null);
  const strokeQuestionRef = useRef(false);
  const lowVelocityFramesRef = useRef(0);
  const evaluateStrokeRef = useRef(null);
  const preStrokeBufferRef = useRef([]);
  const postPadFramesRemainingRef = useRef(0);

  // Tuned stroke capture parameters matching training distribution & mitigating boundary crop
  const PRE_PAD_FRAMES = 5;            // Prepend 5 rolling frames to capture motion wind-up
  const POST_PAD_FRAMES = 4;           // Retain 4 frames after stop condition for wind-down
  const MIN_STROKE_FRAMES = 20;        // Minimum gesture duration before hysteresis stop allowed
  const STOP_LOW_VELOCITY_FRAMES = 10; // Consecutive low-velocity frames (~0.66s) required to stop

  // Time-normalized resampling of variable-length capture (e.g. 15 to 60 frames)
  // to the fixed 30-frame sequence expected by the LSTM model, matching training linspace
  const resampleSequence = (frames, targetLength = 30) => {
    const N = frames.length;
    if (N === targetLength) {
      return frames;
    }
    if (N < 2) {
      const padded = [...frames];
      while (padded.length < targetLength) {
        padded.push(frames[frames.length - 1] || new Array(258).fill(0));
      }
      return padded;
    }

    const resampled = [];
    for (let t = 0; t < targetLength; t++) {
      const pos = (t * (N - 1)) / (targetLength - 1);
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, N - 1);
      const alpha = pos - i0;

      if (alpha === 0 || i0 === i1) {
        resampled.push(frames[i0]);
      } else {
        const f0 = frames[i0];
        const f1 = frames[i1];
        const interpolated = new Float32Array(258);
        for (let k = 0; k < 258; k++) {
          interpolated[k] = (1 - alpha) * f0[k] + alpha * f1[k];
        }
        resampled.push(Array.from(interpolated));
      }
    }
    return resampled;
  };

  const triggerManualRecording = () => {
    if (strokeStateRef.current === "RECORDING" || strokeStateRef.current === "POST_RECORDING") {
      // Manual trigger while recording immediately finalizes and evaluates gesture
      if (evaluateStrokeRef.current) {
        evaluateStrokeRef.current();
      }
      return;
    }
    strokeStateRef.current = "RECORDING";
    strokeFramesRef.current = [...preStrokeBufferRef.current];
    lowVelocityFramesRef.current = 0;
    postPadFramesRemainingRef.current = 0;
    strokeQuestionRef.current = false;
    setStrokeStatus("RECORDING");
    setIsStrokeCapturing(true);
    setRecordingProgress(0);
    setCurrentSign("Recording sign...");
    setUiState("RECORDING");
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        triggerManualRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let activeStream = null;
    let isCancelled = false;

    // Start Webcam
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        activeStream = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            if (!isCancelled && video) {
              video.play().catch(e => {
                if (e.name !== 'AbortError') console.error("Play error:", e);
              });
              setIsStreaming(true);
            }
          };
          if (video.readyState >= 1) {
            video.play().catch(e => {
              if (e.name !== 'AbortError') console.error("Play error:", e);
            });
            setIsStreaming(true);
          }
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    const loadModels = async () => {
      try {
        console.log("Loading labels...");
        try {
          const labelsRes = await fetch('/models/labels.json');
          if (labelsRes.ok) {
            const labelsMap = await labelsRes.json();
            const numLabels = Object.keys(labelsMap).length;
            const loadedActions = Array.from({length: numLabels}, (_, i) => labelsMap[i]);
            setActionsList(loadedActions);
          } else {
            console.warn("Could not load labels.json");
          }
        } catch (e) {
          console.warn("Could not load labels.json", e);
        }

        console.log("Loading TFJS model...");
        tfModelRef.current = await tf.loadLayersModel('/models/model.json');
        
        console.log("Loading MediaPipe tasks...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" },
          runningMode: "VIDEO"
        });
        
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
        
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          runningMode: "VIDEO"
        });

        landmarkersRef.current = { pose: poseLandmarker, hand: handLandmarker, face: faceLandmarker };
        setModelsLoaded(true);
        console.log("All models loaded successfully.");
      } catch(err) {
        console.error("Error loading models:", err);
      }
    };

    startWebcam();
    loadModels();

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const extractKeypoints = (poseResult, handResult, faceResult) => {
    const pose = new Float32Array(33 * 4);
    if (poseResult && poseResult.landmarks && poseResult.landmarks.length > 0) {
        poseResult.landmarks[0].forEach((res, i) => {
            pose[i*4] = res.x; pose[i*4+1] = res.y; pose[i*4+2] = res.z; pose[i*4+3] = res.visibility || 0;
        });
    }

    const face = new Float32Array(478 * 3);
    if (faceResult && faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
        faceResult.faceLandmarks[0].forEach((res, i) => {
            face[i*3] = res.x; face[i*3+1] = res.y; face[i*3+2] = res.z;
        });
    }

    const lh = new Float32Array(21 * 3);
    const rh = new Float32Array(21 * 3);
    if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
        handResult.handednesses.forEach((handednessList, idx) => {
            const handType = handednessList[0].categoryName;
            const landmarks = handResult.landmarks[idx];
            const target = handType === 'Left' ? lh : rh; 
            landmarks.forEach((res, i) => {
                target[i*3] = res.x; target[i*3+1] = res.y; target[i*3+2] = res.z;
            });
        });
    }

    const result = new Float32Array(1692);
    result.set(pose, 0);
    result.set(face, pose.length);
    result.set(lh, pose.length + face.length);
    result.set(rh, pose.length + face.length + lh.length);
    
    // Normalize coordinates relative to nose and scale by shoulder width
    if (result[0] !== 0 || result[1] !== 0) {
      const noseX = result[0];
      const noseY = result[1];
      
      const lShoulderX = result[11 * 4];
      const lShoulderY = result[11 * 4 + 1];
      const rShoulderX = result[12 * 4];
      const rShoulderY = result[12 * 4 + 1];
      
      const shoulderWidth = Math.sqrt(Math.pow(lShoulderX - rShoulderX, 2) + Math.pow(lShoulderY - rShoulderY, 2));
      const scale = shoulderWidth > 0.01 ? shoulderWidth : 1.0;
      
      // Pose
      for (let i = 0; i < 132; i += 4) {
        if (result[i] !== 0 || result[i+1] !== 0) {
          result[i] = (result[i] - noseX) / scale;
          result[i+1] = (result[i+1] - noseY) / scale;
        }
      }
      
      // Face
      for (let i = 132; i < 1566; i += 3) {
        if (result[i] !== 0 || result[i+1] !== 0) {
          result[i] = (result[i] - noseX) / scale;
          result[i+1] = (result[i+1] - noseY) / scale;
        }
      }
      
      // Hands
      for (let i = 1566; i < 1692; i += 3) {
        if (result[i] !== 0 || result[i+1] !== 0) {
          result[i] = (result[i] - noseX) / scale;
          result[i+1] = (result[i+1] - noseY) / scale;
        }
      }
    }
    
    // Trim out Face landmarks (1434 features) to prevent LSTM from keying on facial noise
    // Pose: 0-132, Hands: 1566-1692 -> Total 258 features
    const finalResult = new Float32Array(258);
    finalResult.set(result.slice(0, 132), 0);
    finalResult.set(result.slice(1566, 1692), 132);
    
    return Array.from(finalResult); // Convert to JS array for TF tensor creation
  };

  const [uiState, setUiState] = useState("IDLE"); // IDLE, DETECTING, ASSEMBLING, ERROR
  const predictionsBufferRef = useRef([]);

  useEffect(() => {
    if (!isStreaming || !modelsLoaded) return;
    
    let animationFrameId;
    let lastVideoTime = -1;
    let lastFrameTimeMs = 0;

    const drawLandmarks = (poseRes, handRes, faceRes) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      
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

      const drawSegment = (landmarks, segment, color, opacity) => {
         ctx.save();
         ctx.globalAlpha = opacity;
         ctx.strokeStyle = color;
         ctx.lineWidth = 2.5;
         ctx.beginPath();
         for (const [i, j] of segment) {
           if (landmarks[i] && landmarks[j]) {
             ctx.moveTo(landmarks[i].x * w, landmarks[i].y * h);
             ctx.lineTo(landmarks[j].x * w, landmarks[j].y * h);
           }
         }
         ctx.stroke();
         ctx.restore();
      };

      for (const hand of nextHands) {
        const handOpacity = Math.max(0.2, 1.0 - hand.missedFrames * 0.25);
        for (const [part, lines] of Object.entries(connections)) {
          drawSegment(hand.landmarks, lines, colors[part], handOpacity);
        }
        
        // Draw points with Z-depth mapping and hand opacity
        for (const pt of hand.landmarks) {
          const zOpacity = Math.min(1.0, Math.max(0.3, 1 - (pt.z * 5))) * handOpacity; 
          const r = Math.max(2.5, 6 * zOpacity);
          ctx.fillStyle = `rgba(255, 255, 255, ${zOpacity})`;
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, r, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Drawing recording or recognized badge directly on the canvas
      if (strokeStateRef.current === "RECORDING" || strokeStateRef.current === "POST_RECORDING") {
        ctx.save();
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.beginPath();
        ctx.arc(28, 28, 7, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        ctx.fillText(`CAPTURING GESTURE (${strokeFramesRef.current.length}f)`, 45, 33);
        ctx.restore();
      } else if (strokeStateRef.current === "COOLDOWN") {
        ctx.save();
        ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
        ctx.beginPath();
        ctx.arc(28, 28, 7, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        ctx.fillText("SIGN RECOGNIZED", 45, 33);
        ctx.restore();
      }
    };

    const evaluateStroke = async () => {
      if (strokeFramesRef.current.length === 0) return;
      strokeStateRef.current = "EVALUATING";
      setStrokeStatus("EVALUATING");
      setRecordingProgress(100);
      setUiState("DETECTING");

      const rawFrames = strokeFramesRef.current;
      // Resample variable-length capture across time to the fixed 30-frame sequence
      const normalizedSequence = resampleSequence(rawFrames, sequenceLength);

      const inputTensor = tf.tensor3d([normalizedSequence], [1, sequenceLength, 258]);
      const prediction = tfModelRef.current.predict(inputTensor);
      const scores = await prediction.data();
      inputTensor.dispose();
      prediction.dispose();

      const maxScore = Math.max(...scores);
      const classIndex = scores.indexOf(maxScore);
      let recognizedAction = actionsList[classIndex] || "unknown";
      if (strokeQuestionRef.current) recognizedAction += "?";

      setConfidence(maxScore * 100);

      if (maxScore > 0.40 && recognizedAction !== "idle") {
        setCurrentSign(recognizedAction);

        let curSentence = [...sentenceRef.current];
        if (curSentence.length === 0 || curSentence[curSentence.length - 1] !== recognizedAction) {
          curSentence.push(recognizedAction);
          if (curSentence.length > 5) curSentence.shift();
          sentenceRef.current = curSentence;
          setSentence(curSentence);

          // Trigger Gemini LLM
          setUiState("ASSEMBLING");
          setLlmSentence("");
          fetch('http://localhost:3001/api/assemble', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence: curSentence })
          }).then(async response => {
            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let assembled = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              assembled += decoder.decode(value, { stream: true });
              setLlmSentence(assembled);
            }
            setUiState("COOLDOWN");
          }).catch(err => {
            console.error("LLM Error:", err);
            setLlmSentence("Error generating sentence.");
            setUiState("ERROR");
          });
        }
      } else {
        setCurrentSign(maxScore > 0.40 ? "idle..." : "No sign detected");
      }

      strokeStateRef.current = "COOLDOWN";
      setStrokeStatus("COOLDOWN");
      strokeCooldownRef.current = 15; // ~1 second cooldown
    };

    evaluateStrokeRef.current = evaluateStroke;

    const detectAndPredict = async () => {
      if (isPredictingRef.current) return;
      
      const now = performance.now();
      if (now - lastFrameTimeMs < 66) {
         animationFrameId = requestAnimationFrame(detectAndPredict);
         return;
      }
      
      isPredictingRef.current = true;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        lastFrameTimeMs = now;
        const startTimeMs = performance.now();
        
        try {
          const l = landmarkersRef.current;
          const poseRes = l.pose.detectForVideo(video, startTimeMs);
          const handRes = l.hand.detectForVideo(video, startTimeMs);
          const faceRes = l.face.detectForVideo(video, startTimeMs);
          
          let questionFlag = false;
          if (faceRes.faceLandmarks && faceRes.faceLandmarks.length > 0) {
            const fLm = faceRes.faceLandmarks[0];
            const rightDist = Math.abs(fLm[105].y - fLm[159].y);
            const leftDist = Math.abs(fLm[334].y - fLm[386].y);
            const avgDist = (rightDist + leftDist) / 2.0;
            if (avgDist > 0.04) {
              questionFlag = true;
            }
          }
          setIsQuestion(questionFlag);
          
          // Draw the overlay
          drawLandmarks(poseRes, handRes, faceRes);

          const rawHandCount = (handRes && handRes.landmarks) ? handRes.landmarks.length : 0;
          const handScores = (handRes.handednesses || []).map((h, i) => `${h[0]?.categoryName || 'H' + (i+1)}: ${(h[0]?.score * 100).toFixed(0)}%`).join(', ');
          const activeHandCount = smoothedHandsRef.current.filter(h => h.missedFrames < 3).length;
          
          const keypoints = extractKeypoints(poseRes, handRes, faceRes);

          // Calculate Hand Velocity across frames matching persistent handedness labels
          let handVelocity = 0;
          if (handRes && handRes.landmarks && handRes.landmarks.length > 0) {
            const currentHands = handRes.landmarks;
            const currentHandedness = handRes.handednesses || [];

            if (lastHandLandmarksRef.current && lastHandLandmarksRef.current.length > 0) {
              const prevHandsData = lastHandLandmarksRef.current;

              currentHands.forEach((curr, cIdx) => {
                const label = currentHandedness[cIdx]?.[0]?.categoryName || `Hand_${cIdx}`;
                let prevMatch = prevHandsData.find(p => p.label === label);
                if (!prevMatch && prevHandsData[cIdx]) {
                  prevMatch = prevHandsData[cIdx];
                }

                if (prevMatch && prevMatch.landmarks) {
                  const prev = prevMatch.landmarks;
                  for (const idx of [0, 4, 8, 12, 16, 20]) {
                    if (curr[idx] && prev[idx]) {
                      const dx = curr[idx].x - prev[idx].x;
                      const dy = curr[idx].y - prev[idx].y;
                      handVelocity += Math.sqrt(dx * dx + dy * dy);
                    }
                  }
                }
              });
            }

            lastHandLandmarksRef.current = currentHands.map((lm, cIdx) => ({
              label: currentHandedness[cIdx]?.[0]?.categoryName || `Hand_${cIdx}`,
              landmarks: lm
            }));
          } else {
            lastHandLandmarksRef.current = null;
          }

          setDebugInfo(`Pose: ${poseRes.landmarks ? poseRes.landmarks.length > 0 : false} | Hands: ${rawHandCount} (${handScores || 'None'}) | Motion: ${handVelocity.toFixed(2)} | Mode: ${isStrokeModeRef.current ? 'Stroke' : 'Rolling'}`);

          if (isStrokeModeRef.current) {
            // =========================================================
            // HYSTERESIS-BASED VARIABLE-LENGTH STROKE CAPTURE
            // =========================================================
            const activeHands = smoothedHandsRef.current.filter(h => h.missedFrames < 3);

            if (strokeStateRef.current === "COOLDOWN") {
              strokeCooldownRef.current -= 1;
              if (strokeCooldownRef.current <= 0 && handVelocity < 0.035) {
                strokeStateRef.current = "IDLE";
                setStrokeStatus("IDLE");
                setIsStrokeCapturing(false);
                setRecordingProgress(0);
                setUiState("IDLE");
                preStrokeBufferRef.current = [];
              }
            } else if (strokeStateRef.current === "IDLE") {
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
            } else if (strokeStateRef.current === "RECORDING") {
              strokeFramesRef.current.push(keypoints);
              if (questionFlag) strokeQuestionRef.current = true;
              
              const currentFrameCount = strokeFramesRef.current.length;

              // 2. Sustain threshold: if velocity stays above 0.018, reset pause counter
              if (handVelocity < 0.018) {
                lowVelocityFramesRef.current += 1;
              } else {
                lowVelocityFramesRef.current = 0;
              }

              // Visual indicator relative to typical 35-frame sign duration
              const progressPct = Math.min(100, Math.round((currentFrameCount / 35) * 100));
              setRecordingProgress(progressPct);

              // 3. Stop conditions with pause/dip tolerance & post-padding:
              // - Gesture must reach MIN_STROKE_FRAMES (20) before hysteresis stop is allowed
              // - Requires STOP_LOW_VELOCITY_FRAMES (10) consecutive frames below 0.018 (~0.66s pause)
              // - If stop condition is met: transition to POST_RECORDING to capture wind-down padding
              // - Safety cap: 60 frames immediately finalizes
              const isStopHysteresis = (currentFrameCount >= MIN_STROKE_FRAMES && lowVelocityFramesRef.current >= STOP_LOW_VELOCITY_FRAMES);
              const isSafetyCap = (currentFrameCount >= 60);

              if (isSafetyCap) {
                evaluateStroke();
              } else if (isStopHysteresis) {
                strokeStateRef.current = "POST_RECORDING";
                postPadFramesRemainingRef.current = POST_PAD_FRAMES;
              }
            } else if (strokeStateRef.current === "POST_RECORDING") {
              strokeFramesRef.current.push(keypoints);
              if (questionFlag) strokeQuestionRef.current = true;

              // Multi-part / repetitive motion continuation check (Step 3):
              // If motion re-accelerates before post-pad finishes, treat as continuation of stroke
              if (handVelocity >= 0.038) {
                strokeStateRef.current = "RECORDING";
                lowVelocityFramesRef.current = 0;
                postPadFramesRemainingRef.current = 0;
              } else {
                postPadFramesRemainingRef.current -= 1;
                if (postPadFramesRemainingRef.current <= 0 || strokeFramesRef.current.length >= 60) {
                  evaluateStroke();
                }
              }
            }
          } else {
            // ===============================================
            // CONTINUOUS ROLLING BUFFER (WITH HYSTERESIS)
            // ===============================================
            sequenceRef.current.push(keypoints);
            if (sequenceRef.current.length > sequenceLength) {
              sequenceRef.current.shift();
            }

            if (sequenceRef.current.length === sequenceLength) {
               setUiState("DETECTING");
               const inputTensor = tf.tensor3d([sequenceRef.current], [1, sequenceLength, 258]);
               const prediction = tfModelRef.current.predict(inputTensor);
               const scores = await prediction.data();
               inputTensor.dispose();
               prediction.dispose();
               
               const maxScore = Math.max(...scores);
               const classIndex = scores.indexOf(maxScore);
               
               setConfidence(maxScore * 100);
               
               const activeHands = smoothedHandsRef.current.filter(h => h.missedFrames < 3);
               if (activeHands.length === 0) {
                  setCurrentSign("Waiting...");
                  predictionsBufferRef.current = [];
               } else if (maxScore > 0.50 && actionsList.length > 0) {
                  let action = actionsList[classIndex];
                  if (questionFlag) action += "?";
                  
                  const handConf = activeHands.reduce((acc, h) => acc + h.score, 0) / activeHands.length;

                  predictionsBufferRef.current.push({ sign: action, weight: handConf });
                  if (predictionsBufferRef.current.length > 5) {
                    predictionsBufferRef.current.shift();
                  }
                  
                  const counts = {};
                  let totalWeight = 0;
                  predictionsBufferRef.current.forEach(v => { 
                    counts[v.sign] = (counts[v.sign] || 0) + v.weight; 
                    totalWeight += v.weight;
                  });
                  
                  let majoritySign = null;
                  for (const [sign, weight] of Object.entries(counts)) {
                      if (weight > (totalWeight * 0.5)) majoritySign = sign;
                  }
                                   
                  setCurrentSign(action);
                  
                  if (majoritySign && majoritySign !== "idle") {
                    let curSentence = [...sentenceRef.current];
                    if (curSentence.length === 0 || curSentence[curSentence.length - 1] !== majoritySign) {
                      curSentence.push(majoritySign);
                      if (curSentence.length > 5) curSentence.shift();
                      sentenceRef.current = curSentence;
                      setSentence(curSentence);
                      
                      setUiState("ASSEMBLING");
                      setLlmSentence("");
                      fetch('http://localhost:3001/api/assemble', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sequence: curSentence })
                      }).then(async response => {
                        if (!response.body) return;
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder('utf-8');
                        let assembled = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          assembled += decoder.decode(value, { stream: true });
                          setLlmSentence(assembled);
                        }
                        setUiState("IDLE");
                      }).catch(err => {
                        console.error("LLM Error:", err);
                        setLlmSentence("Error generating sentence.");
                        setUiState("ERROR");
                      });
                    }
                  }
               }
            }
          }
        } catch(e) {
          console.error(e);
          setUiState("ERROR");
        }
      }
      isPredictingRef.current = false;
      animationFrameId = requestAnimationFrame(detectAndPredict);
    };

    detectAndPredict();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isStreaming, modelsLoaded, actionsList]);

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <h1>SignAI</h1>
          <p>Real-time Translation Pipeline</p>
        </div>
        <div className={`ui-state-badge ${uiState.toLowerCase()}`}>
          <div className="ui-state-indicator"></div>
          {uiState}
        </div>
      </header>

      <main className="main-content">
        <section className="video-section">
          <div className="video-container">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              onLoadedMetadata={(e) => {
                e.target.width = e.target.videoWidth;
                e.target.height = e.target.videoHeight;
              }}
            />
            <canvas ref={canvasRef} className="canvas-overlay" />
          </div>
          
          <div className="info-text">
            <span>[DEBUG] {debugInfo}</span>
            <span>FEAT: 258</span>
            <label style={{ marginLeft: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={showFaceMesh} 
                onChange={(e) => setShowFaceMesh(e.target.checked)} 
              />
              Show Face Mesh
            </label>
          </div>
        </section>

        <section className="controls-panel">
          <div className="data-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Sign Detection</h3>
              <span style={{ 
                fontSize: '0.75rem', 
                fontFamily: 'JetBrains Mono', 
                color: strokeStatus === 'RECORDING' ? '#ef4444' : strokeStatus === 'COOLDOWN' ? '#10b981' : 'var(--text-muted)' 
              }}>
                {strokeStatus === 'RECORDING' ? `CAPTURING (${recordingProgress}%)` : strokeStatus === 'COOLDOWN' ? 'LOCKED' : 'READY'}
              </span>
            </div>

            <div className="translation-text" style={{ color: strokeStatus === 'RECORDING' ? '#f59e0b' : 'var(--text-main)' }}>
              {currentSign.toUpperCase()}
            </div>
            
            {/* Gesture Stroke Progress Bar */}
            <div className="gesture-progress-container">
              <div 
                className={`gesture-progress-bar ${strokeStatus === 'RECORDING' ? 'recording' : ''}`}
                style={{ width: `${recordingProgress}%` }}
              ></div>
            </div>

            <div className="confidence-bar-container">
              <div 
                className="confidence-bar" 
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
            <div className="conf-label">
              CONFIDENCE: {confidence.toFixed(1)}%
            </div>

            {/* Manual Trigger Button & Mode Toggle */}
            <button 
              className={`btn-record ${strokeStatus === 'RECORDING' ? 'recording' : ''}`}
              onClick={triggerManualRecording}
              disabled={!modelsLoaded}
            >
              {strokeStatus === 'RECORDING' ? `Recording Gesture (${recordingProgress}%)... Click / Space to Finish` : '● Record Gesture (Spacebar)'}
            </button>

            <div className="mode-toggle-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isStrokeMode} 
                  onChange={(e) => {
                    setIsStrokeMode(e.target.checked);
                    isStrokeModeRef.current = e.target.checked;
                  }} 
                />
                Dynamic Stroke Capture (Anti-Fluctuation)
              </label>
            </div>

            {isQuestion && (
              <div className="question-indicator">
                NMF: Eyebrow Raise (?)
              </div>
            )}
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
              {llmSentence || "Waiting for context..."}
            </div>
          </div>
          
          <button className="btn" onClick={() => {
              setSentence([]);
              sentenceRef.current = [];
              setCurrentSign("Waiting...");
              setUiState("IDLE");
          }}>
            [ Clear Context ]
          </button>
        </section>
      </main>
    </div>
  );
}

export default App;
