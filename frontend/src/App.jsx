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
  
  const actions = [
    "sleep", "time", "late", "good", "easy", "sister", 
    "brother", "water", "walk", "teach", "apple", "snake", 
    "laptop", "tree", "hello", "thanks"
  ];
  const sequenceLength = 30;

  // Refs for logic loop
  const sequenceRef = useRef([]);
  const sentenceRef = useRef([]);
  const tfModelRef = useRef(null);
  const landmarkersRef = useRef(null);
  const isPredictingRef = useRef(false);

  useEffect(() => {
    // Start Webcam
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Play error:", e));
          setIsStreaming(true);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    const loadModels = async () => {
      try {
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
          numHands: 2
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
    
    // Normalize coordinates relative to nose (pose[0], pose[1]) to be invariant to camera distance
    if (result[0] !== 0 || result[1] !== 0) {
      const noseX = result[0];
      const noseY = result[1];
      
      // Pose
      for (let i = 0; i < 132; i += 4) {
        if (result[i] !== 0 || result[i+1] !== 0) {
          result[i] -= noseX;
          result[i+1] -= noseY;
        }
      }
      
      // Face
      for (let i = 132; i < 1566; i += 3) {
        if (result[i] !== 0 || result[i+1] !== 0) {
          result[i] -= noseX;
          result[i+1] -= noseY;
        }
      }
      
      // Hands
      for (let i = 1566; i < 1692; i += 3) {
        if (result[i] !== 0 || result[i+1] !== 0) {
          result[i] -= noseX;
          result[i+1] -= noseY;
        }
      }
    }
    
    return Array.from(result); // Convert to JS array for TF tensor creation
  };

  useEffect(() => {
    if (!isStreaming || !modelsLoaded) return;
    
    let animationFrameId;
    let lastVideoTime = -1;

    const detectAndPredict = async () => {
      if (isPredictingRef.current) return;
      isPredictingRef.current = true;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const startTimeMs = performance.now();
        
        try {
          const l = landmarkersRef.current;
          const poseRes = l.pose.detectForVideo(video, startTimeMs);
          const handRes = l.hand.detectForVideo(video, startTimeMs);
          const faceRes = l.face.detectForVideo(video, startTimeMs);
          
          // NMF Heuristic: Raised Eyebrows (Indices 105 & 334 vs 159 & 386)
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

          const keypoints = extractKeypoints(poseRes, handRes, faceRes);
          // DEBUG STATE
          setDebugInfo(`Pose: ${poseRes.landmarks.length > 0} | Face: ${faceRes.faceLandmarks.length > 0} | Hands: ${handRes.landmarks.length}`);
          
          sequenceRef.current.push(keypoints);
          if (sequenceRef.current.length > sequenceLength) {
            sequenceRef.current.shift();
          }

          if (sequenceRef.current.length === sequenceLength) {
             const inputTensor = tf.tensor3d([sequenceRef.current], [1, sequenceLength, 1692]);
             const prediction = tfModelRef.current.predict(inputTensor);
             const scores = await prediction.data();
             inputTensor.dispose();
             prediction.dispose();
             
             const maxScore = Math.max(...scores);
             const classIndex = scores.indexOf(maxScore);
             
             setConfidence(maxScore * 100);
             
             if (maxScore > 0.70) {
                let action = actions[classIndex];
                if (questionFlag) action += "?";
                setCurrentSign(action);
                
                let curSentence = [...sentenceRef.current];
                if (curSentence.length === 0 || curSentence[curSentence.length - 1] !== action) {
                  curSentence.push(action);
                  if (curSentence.length > 5) curSentence.shift();
                  sentenceRef.current = curSentence;
                  setSentence(curSentence);
                  
                  // Mock LLM Assembly
                  const s = curSentence.join(" ");
                  if (s.includes("help?")) setLlmSentence("Do you need some help?");
                  else if (s.includes("hello") && s.includes("thanks")) setLlmSentence("Hello, and thank you.");
                  else if (s.includes("iloveyou")) setLlmSentence("I love you.");
                  else setLlmSentence("...");
                }
             }
          }
        } catch(e) {
          console.error(e);
        }
      }
      isPredictingRef.current = false;
      animationFrameId = requestAnimationFrame(detectAndPredict);
    };

    detectAndPredict();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isStreaming, modelsLoaded]);

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <h1>SignAI</h1>
          <p>Dynamic Sign Language Translation Engine</p>
        </div>
      </header>

      <main className="main-content">
        <section className="glass-panel video-section">
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
            <canvas className="canvas-overlay" />
            
            <div className="status-badge">
              <div className={`status-indicator ${(isStreaming && modelsLoaded) ? 'active' : ''}`}></div>
              {(isStreaming && modelsLoaded) ? 'Live Inference Active' : 'Loading Models...'}
            </div>
          </div>
          
          <p className="info-text">
            <strong>DEBUG:</strong> {debugInfo}<br/>
            LSTM sequence modeling running over MediaPipe Hand & Face landmarks. 
            <strong> 1,692 features per frame.</strong>
          </p>
        </section>

        <section className="controls-panel">
          <div className="glass-panel translation-box">
            <h3>Raw Sign Detection</h3>
            <div className="translation-text">
              {currentSign.toUpperCase()}
            </div>
            
            <div className="confidence-bar-container">
              <div 
                className="confidence-bar" 
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', textAlign: 'right' }}>
              Conf: {confidence.toFixed(1)}%
            </div>

            {isQuestion && (
              <div className="question-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                NMF Detected: Raised Eyebrows (Question)
              </div>
            )}
          </div>

          <div className="glass-panel translation-box">
             <h3>Sequence Context</h3>
             <div className="translation-text" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
               {sentence.join(" → ") || "..."}
             </div>
          </div>

          <div className="glass-panel translation-box llm-output">
            <h3>LLM Semantic Assembly</h3>
            <div className="llm-text">
              "{llmSentence}"
            </div>
          </div>
          
          <button className="btn" onClick={() => {
              setSentence([]);
              sentenceRef.current = [];
              setCurrentSign("Waiting...");
          }}>
            Clear Context
          </button>
        </section>
      </main>
    </div>
  );
}

export default App;
