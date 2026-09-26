import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { FilesetResolver, PoseLandmarker, HandLandmarker, FaceLandmarker } from '@mediapipe/tasks-vision';
import DemoMode from './DemoMode';
import './index.css';
import { extractKeypoints } from './utils/features.js';
import { resampleSequence } from './utils/resampling.js';
import { CAPTURE, captureStopDecision, decidePrediction, validateLabels } from './utils/recognition.js';
import {createTrial, UNKNOWN_TRIAL} from './utils/validationRecorder.js';
const LANDMARK_DEBUG = new URLSearchParams(window.location.search).has('landmarkDebug');
const EXPERIMENTAL_QUESTIONS = import.meta.env.VITE_EXPERIMENTAL_QUESTIONS === 'true';
const formatToken = token => typeof token === 'string' ? token : token.letters.join('');

  const PRE_PAD_FRAMES = CAPTURE.preFrames;            // Prepend 5 rolling frames to capture motion wind-up
  const POST_PAD_FRAMES = CAPTURE.postFrames;           // Retain 4 frames after stop condition for wind-down
  const MIN_STROKE_FRAMES = CAPTURE.minFrames;        // Minimum gesture duration before hysteresis stop allowed


function LiveTranslator({ onEnterDemo }) {
  const videoRef = useRef(null);
  const diagnosticRef = useRef(null);
  const trialSettingsRef = useRef({target:'',notes:''});
  const captureSettingsRef = useRef(null);
  const observationsRef = useRef(new WeakMap());
  const [trials,setTrials] = useState([]);
  const [trialMessage,setTrialMessage] = useState('');
  const exportTrials = () => {
    const blob = new Blob([JSON.stringify({format:'sanket-validation-v1',purpose:'manual validation; not training data',labels:actionsList,model:'deployed browser model; artifact hash not recorded',trials},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download=`sanket-validation-${Date.now()}.json`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
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
  const [fingerspellInput, setFingerspellInput] = useState("");

  const handleAddFingerspell = () => {
    if (!fingerspellInput.trim()) return;
    const cleanLetters = fingerspellInput.trim().toUpperCase().replace(/[^A-Z]/g, '').split('');
    if (cleanLetters.length === 0) return;
    const updated = [...sentenceRef.current, {type:'fingerspell', kind:'name', letters:cleanLetters}];
    sentenceRef.current = updated;
    setSentence(updated);
    setFingerspellInput("");
  };

  // Refs for logic loop & stroke engine
  const canvasRef = useRef(null);
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

  const isArmedRef = useRef(false);
  const [isArmed, setIsArmed] = useState(false);

  const toggleRecording = () => {
    if (strokeStateRef.current === "RECORDING") {
      if (evaluateStrokeRef.current) evaluateStrokeRef.current();
    } else if (strokeStateRef.current === "IDLE" || strokeStateRef.current === "COOLDOWN") {
      isArmedRef.current = true;
      setIsArmed(true);
      strokeStateRef.current = "ARMED";
      setStrokeStatus("ARMED");
      setUiState("ARMED");
      setCurrentSign("Ready... Perform sign.");
    } else if (strokeStateRef.current === "ARMED") {
      isArmedRef.current = false;
      setIsArmed(false);
      strokeStateRef.current = "IDLE";
      setStrokeStatus("IDLE");
      setUiState("WAITING");
      setCurrentSign("Waiting...");
    }
  };

  const assemblyRef = useRef(null);
  const faceMeshRef = useRef(false);
  faceMeshRef.current = showFaceMesh;
  const triggerAssembly = async () => {
    if (!sentenceRef.current.length || assemblyRef.current) return;
    const snapshot = [...sentenceRef.current];
    const controller = new AbortController();
    assemblyRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 25000);
    setUiState('ASSEMBLING'); setLlmSentence('');
    try {
      const response = await fetch('http://127.0.0.1:3001/api/assemble', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sequence:snapshot}), signal:controller.signal,
      });
      if (!response.ok || !response.body) throw new Error('Sentence service rejected the request');
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let assembled = '';
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        assembled += decoder.decode(value,{stream:true});
        if (assemblyRef.current === controller) setLlmSentence(assembled);
      }
      assembled += decoder.decode();
      if (!assembled.trim()) throw new Error('Empty sentence response');
      if (assemblyRef.current !== controller) return;
      setLlmSentence(assembled); setUiState('WAITING');
      // Retain signs added after this request began.
      sentenceRef.current = sentenceRef.current.slice(snapshot.length);
      setSentence([...sentenceRef.current]);
    } catch (error) {
      if (assemblyRef.current === controller) {
        setLlmSentence('Sentence service unavailable or interrupted. Your signs are retained.');
        setUiState('ERROR'); console.error(error);
      }
    } finally {
      clearTimeout(timeout);
      if (assemblyRef.current === controller) assemblyRef.current = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let activeStream = null;
    let isCancelled = false;
    const resources = [];

    // Start Webcam
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
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
        if (!isCancelled) { setUiState("ERROR"); setCurrentSign("Camera unavailable. Check permission and connection."); }
        console.error("Error accessing webcam:", err);
      }
    };

    const loadModels = async () => {
      try {
        const labelsRes = await fetch('/models/labels.json');
        if (!labelsRes.ok) throw new Error('Cannot load label map');
        const labelsMap = await labelsRes.json();
        const model = await tf.loadLayersModel('/models/model.json');
        if (isCancelled) { model.dispose(); return; }
        resources.push(() => model.dispose());
        if (model.inputs[0].shape[1] !== 30 || model.inputs[0].shape[2] !== 258) throw new Error('Model input must be 30 × 258');
        setActionsList(validateLabels(labelsMap, model.outputs[0].shape[1]));
        tfModelRef.current = model;

        console.log("Loading MediaPipe tasks...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (isCancelled) return;
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" },
          runningMode: "VIDEO"
        });
        
        if (isCancelled) { poseLandmarker.close(); return; }
        resources.push(() => poseLandmarker.close());
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
        
        if (isCancelled) { handLandmarker.close(); return; }
        resources.push(() => handLandmarker.close());
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          runningMode: "VIDEO"
        });

        if (isCancelled) { faceLandmarker.close(); return; }
        resources.push(() => faceLandmarker.close());
        landmarkersRef.current = { pose: poseLandmarker, hand: handLandmarker, face: faceLandmarker };
        setModelsLoaded(true);
        console.log("All models loaded successfully.");
      } catch(err) {
        resources.splice(0).reverse().forEach(close => close());
        if (!isCancelled) { setUiState("ERROR"); setCurrentSign("Model loading failed. Reload to retry."); }
        console.error("Error loading models:", err);
      }
    };

    startWebcam();
    loadModels();

    return () => {
      isCancelled = true;
      assemblyRef.current?.abort(); assemblyRef.current = null;
      resources.splice(0).reverse().forEach(close => close());
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const [uiState, setUiState] = useState("WAITING"); // WAITING, CAPTURING, PROCESSING, RECOGNIZED, UNCERTAIN, ERROR

  useEffect(() => {
    if (!isStreaming || !modelsLoaded) return;
    
    let cancelled = false;
    let evaluating = false;
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
        if (faceMeshRef.current) {
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
        ctx.fillText("CAPTURE COMPLETE", 45, 33);
        ctx.restore();
      }
    };

    const evaluateStroke = async () => {
      if (evaluating || cancelled) return;
      if (strokeFramesRef.current.length < MIN_STROKE_FRAMES) {
        setCurrentSign('Capture too short — keep signing before stopping.');
        return;
      }
      evaluating = true;
      strokeStateRef.current = 'EVALUATING'; setStrokeStatus('PROCESSING'); setUiState('PROCESSING');
      let inputTensor, prediction;
      try {
        const normalizedSequence = resampleSequence(strokeFramesRef.current, sequenceLength);
        if (LANDMARK_DEBUG) {
          window.sanketDiagnosticSequence = {shape:[normalizedSequence.length, normalizedSequence[0].length], finite:normalizedSequence.every(f=>f.every(Number.isFinite)), capturedAt:new Date().toISOString()};
        }
        inputTensor = tf.tensor3d([normalizedSequence], [1,sequenceLength,258]);
        prediction = tfModelRef.current.predict(inputTensor);
        const scores = await prediction.data();
        if (cancelled) return;
        const {top,ranked,accepted} = decidePrediction(scores, actionsList);
        if (LANDMARK_DEBUG) {
          window.sanketDiagnosticSequence.prediction = {
            top3:ranked.slice(0,3).map(({action,score})=>({label:action,confidence:score})),
            margin:ranked[0].score-(ranked[1]?.score ?? 0), accepted,
            completedAt:new Date().toISOString()
          };
        }
        if (LANDMARK_DEBUG && captureSettingsRef.current?.target) {
          try {
            const trial=createTrial({...captureSettingsRef.current,sequence:normalizedSequence,
              frames:strokeFramesRef.current,observations:strokeFramesRef.current.map(f=>observationsRef.current.get(f)),
              scores,labels:actionsList});
            setTrials(previous=>previous.length < 100 ? [...previous,trial] : previous);
            setTrialMessage('Capture processed. Maximum 100 saved trials per session; export before leaving.');
          } catch(error) { setTrialMessage(`Trial not saved: ${error.message}`); }
        }
        setConfidence(top.score*100);
        setDebugInfo(ranked.slice(0,3).map(c=>`${c.action}: ${(c.score*100).toFixed(1)}%`).join(' | '));
        if (accepted) {
          const action = top.action + (EXPERIMENTAL_QUESTIONS && strokeQuestionRef.current ? '?' : '');
          sentenceRef.current = [...sentenceRef.current, action];
          setSentence([...sentenceRef.current]); setCurrentSign(action); setUiState('RECOGNIZED');
        } else { setCurrentSign('Uncertain — try again'); setUiState('UNCERTAIN'); }
      } catch (error) {
        if (!cancelled) {setUiState('ERROR');setCurrentSign('Recognition failed; please retry.');console.error(error);}
      } finally {
        inputTensor?.dispose(); prediction?.dispose(); evaluating = false;
        if (!cancelled) {
          strokeFramesRef.current = []; strokeStateRef.current = 'COOLDOWN';
          setStrokeStatus('COOLDOWN'); strokeCooldownRef.current = 15;
        }
      }
    };

    evaluateStrokeRef.current = evaluateStroke;

    const detectAndPredict = async () => {
      if (cancelled || isPredictingRef.current) return;
      
      const now = performance.now();
      if (now - lastFrameTimeMs < CAPTURE.sampleIntervalMs) {
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
          if (EXPERIMENTAL_QUESTIONS && faceRes.faceLandmarks && faceRes.faceLandmarks.length > 0) {
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
          
          const keypoints = extractKeypoints(poseRes, handRes);
          if (LANDMARK_DEBUG) {
            const sides=(handRes.handednesses || []).map(h=>h[0]?.categoryName);
            observationsRef.current.set(keypoints,{time:startTimeMs,pose:!!poseRes.landmarks?.[0]?.length,
              left:sides.filter(s=>s==='Left').length===1,right:sides.filter(s=>s==='Right').length===1});
          }
          if (LANDMARK_DEBUG) {
            const report = {time:new Date().toISOString(), pose:poseRes.landmarks?.[0]?.length ?? 0,
              hands:(handRes.landmarks || []).map((points,i)=>({category:handRes.handednesses[i]?.[0]?.categoryName, count:points.length})),
              features:keypoints.length, finite:keypoints.every(Number.isFinite),
              leftSlotNonzero:keypoints.slice(132,195).some(v=>v!==0), rightSlotNonzero:keypoints.slice(195,258).some(v=>v!==0),
              inputMirrored:false, previewMirrored:true, sequence:window.sanketDiagnosticSequence ?? null};
            if (diagnosticRef.current) diagnosticRef.current.textContent = JSON.stringify(report,null,2);
            const ctx = canvasRef.current.getContext('2d');
            const annotate = (points,prefix,color) => points.forEach((p,i)=>{
              ctx.save(); ctx.translate(p.x*canvasRef.current.width,p.y*canvasRef.current.height);
              ctx.scale(-1,1); ctx.font='12px monospace'; ctx.fillStyle=color;
              ctx.fillText(`${prefix}${i}`,0,0); ctx.restore();
            });
            annotate(poseRes.landmarks?.[0] || [],'P','#fff');
            (handRes.landmarks || []).forEach((points,i)=>{
              const side=handRes.handednesses[i]?.[0]?.categoryName;
              annotate(points,side==='Left'?'L':side==='Right'?'R':'?' ,side==='Left'?'#00ffff':'#ff9900');
            });
          }

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

          // =========================================================
          // STRICT MANUAL WORKFLOW (NO AUTO-GUESSING)
          // =========================================================
          const activeHands = handRes.landmarks || [];

          if (strokeStateRef.current === "COOLDOWN") {
            strokeCooldownRef.current -= 1;
            if (strokeCooldownRef.current <= 0) {
              strokeStateRef.current = "IDLE";
              setStrokeStatus("IDLE");
              setRecordingProgress(0);
              setUiState("WAITING");
              preStrokeBufferRef.current = [];
              isArmedRef.current = false;
              setIsArmed(false);
            }
          } else if (strokeStateRef.current === "ARMED") {
            // Wait for user to move to start recording
            if (activeHands.length > 0 && handVelocity >= CAPTURE.startMotion) {
              captureSettingsRef.current = {...trialSettingsRef.current};
              strokeStateRef.current = "RECORDING";
              strokeFramesRef.current = [...preStrokeBufferRef.current, keypoints];
              lowVelocityFramesRef.current = 0;
              strokeQuestionRef.current = questionFlag;
              setStrokeStatus("RECORDING");
              setCurrentSign("Capturing sign...");
              setUiState("CAPTURING");
            }
          } else if (strokeStateRef.current === "RECORDING") {
            // Manual stop always works; optional dynamic mode adds hysteresis.
            strokeFramesRef.current.push(keypoints);
            if (questionFlag) strokeQuestionRef.current = true;
            setRecordingProgress(strokeFramesRef.current.length);
            const stop = captureStopDecision(strokeFramesRef.current.length, handVelocity, lowVelocityFramesRef.current, isStrokeModeRef.current);
            lowVelocityFramesRef.current = stop.lowFrames;
            if (stop.evaluate) {
              await evaluateStroke();
            } else if (stop.postRecord) {
              strokeStateRef.current = 'POST_RECORDING';
              postPadFramesRemainingRef.current = POST_PAD_FRAMES;
            }
          } else if (strokeStateRef.current === 'POST_RECORDING') {
            strokeFramesRef.current.push(keypoints);
            if (--postPadFramesRemainingRef.current <= 0) await evaluateStroke();

          }
          preStrokeBufferRef.current = [...preStrokeBufferRef.current, keypoints].slice(-PRE_PAD_FRAMES);
        } catch (e) {
          console.error(e);
          setUiState("ERROR");
        }
      }
      isPredictingRef.current = false;
      animationFrameId = requestAnimationFrame(detectAndPredict);
    };

    detectAndPredict();
    return () => { cancelled = true; evaluateStrokeRef.current = null; cancelAnimationFrame(animationFrameId); };
  }, [isStreaming, modelsLoaded, actionsList]);


  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <h2>Sanket ISL Translator</h2>
          <p>Real-time Translation Pipeline</p>
        </div>
        <div className={`ui-state-badge ${uiState.toLowerCase()}`}>
          <div className="ui-state-indicator"></div>
          {uiState}
        </div>
        <button className="btn" disabled={import.meta.env.PROD} title={import.meta.env.PROD ? "Demo footage is available only in local development pending redistribution review." : "Scripted presentation with prerecorded outputs"} onClick={onEnterDemo} style={{ marginLeft: 'auto' }}>
          {import.meta.env.PROD ? "Demo: local setup required" : "Enter Demo Mode"}
        </button>
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
          
          {LANDMARK_DEBUG && <fieldset>
            <legend>Validation recorder — local session only</legend>
            <label>Intended sign <select defaultValue="" onChange={e=>{trialSettingsRef.current.target=e.target.value;}}>
              <option value="">Recording trials off</option>
              <option value={UNKNOWN_TRIAL}>Random / no known sign</option>
              {actionsList.map(label=><option key={label} value={label}>{label}</option>)}
            </select></label>
            <label>Conditions / signer alias <input maxLength={200} onChange={e=>{trialSettingsRef.current.notes=e.target.value;}} placeholder="signer-01, bright, 1 metre" /></label>
            <p>Select before recording. Label and notes are frozen at motion onset. No camera images are saved.
              Export before refreshing or entering demo; trials are held in memory only.</p>
            <button disabled={!trials.length} onClick={exportTrials}>Export {trials.length} trials (JSON)</button>
            <p role="status">{trialMessage}</p>
            {trials.slice(-5).map(t=><p key={t.id}>{t.intendedLabel} → {t.top3[0].action} ({(100*t.top3[0].score).toFixed(1)}%);
              {t.accepted?' accepted':' uncertain'}; {t.correct?'match':'mismatch'}</p>)}
          </fieldset>}
          {LANDMARK_DEBUG && <pre ref={diagnosticRef} aria-live="off" style={{whiteSpace:"pre-wrap"}}>Waiting for physical camera landmarks…</pre>}
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
                {strokeStatus === 'RECORDING' ? `CAPTURING (${recordingProgress}f)` : strokeStatus === 'COOLDOWN' ? 'LOCKED' : 'READY'}
              </span>
            </div>

            <div className="translation-text" style={{ color: strokeStatus === 'RECORDING' ? '#f59e0b' : 'var(--text-main)' }}>
              {currentSign.toUpperCase()}
            </div>
            
            {/* Gesture Stroke Progress Bar */}
            <div className="gesture-progress-container">
              <div 
                className={`gesture-progress-bar ${strokeStatus === 'RECORDING' ? 'recording' : ''}`}
                style={{ width: `${Math.min(100, recordingProgress / CAPTURE.maxFrames * 100)}%` }}
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`btn-record ${strokeStatus === 'RECORDING' ? 'recording' : ''} ${isArmed ? 'armed' : ''}`}
                onClick={toggleRecording}
                disabled={!modelsLoaded}
                style={{ flex: 1, backgroundColor: strokeStatus === 'RECORDING' ? '#ef4444' : isArmed ? '#f59e0b' : '' }}
              >
                {strokeStatus === 'RECORDING' ? `Stop (Recording ${recordingProgress}f)` : isArmed ? 'Waiting for motion...' : '● Record Next Sign (Spacebar)'}
              </button>
              
              <button 
                className="btn-record"
                onClick={triggerAssembly}
                disabled={sentence.length === 0}
                style={{ flex: 1, backgroundColor: '#3b82f6' }}
              >
                ◼ Finish & Translate
              </button>
            </div>

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
                Experimental: eyebrow heuristic (?)
              </div>
            )}
          </div>

          <div className="data-panel">
             <h3>Sequence Context</h3>
             <div className="sequence-text">
               {sentence.length > 0 ? sentence.map(formatToken).join(" → ") : "..."}
             </div>
             <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
               <input
                 type="text"
                 placeholder="Spell letters / Name (e.g. Ujjwal)..."
                 value={fingerspellInput}
                 onChange={(e) => setFingerspellInput(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     handleAddFingerspell();
                   }
                 }}
                 style={{
                   flex: 1,
                   background: 'rgba(255, 255, 255, 0.05)',
                   border: '1px solid rgba(255, 255, 255, 0.15)',
                   color: '#fff',
                   padding: '0.35rem 0.6rem',
                   borderRadius: '4px',
                   fontSize: '0.75rem',
                   fontFamily: 'monospace'
                 }}
               />
               <button 
                 className="btn" 
                 onClick={handleAddFingerspell}
                 style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#3b82f6', color: '#fff', whiteSpace: 'nowrap' }}
               >
                 + Spell Name
               </button>
             </div>
          </div>

          <div className="data-panel llm-output">
            <h3>LLM Assembly</h3>
            <div className="llm-text">
              {llmSentence || "Waiting for context..."}
            </div>
          </div>
          
          <button className="btn" onClick={() => {
              assemblyRef.current?.abort(); assemblyRef.current = null;
              setSentence([]);
              sentenceRef.current = [];
              setCurrentSign("Waiting...");
              setUiState("WAITING");
          }}>
            [ Clear Context ]
          </button>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [demo, setDemo] = useState(false);
  return demo ? <DemoMode onExit={() => setDemo(false)} /> : <LiveTranslator onEnterDemo={() => setDemo(true)} />;
}
