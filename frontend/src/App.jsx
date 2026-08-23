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

  // Refs for logic loop
  const canvasRef = useRef(null);
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
    
    // Trim out Face landmarks (1434 features) to prevent LSTM from keying on noise
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

    const drawLandmarks = (handRes, faceRes) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      
      const ctx = canvas.getContext('2d');
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      
      // Face Mesh Toggle
      if (showFaceMesh && faceRes && faceRes.faceLandmarks) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        for (const face of faceRes.faceLandmarks) {
          for (const pt of face) {
            ctx.rect(pt.x * w, pt.y * h, 1, 1);
          }
        }
        ctx.fill();
      }
      
      // Hands (Instagram-filter style overlay)
      if (handRes && handRes.landmarks) {
        const connections = {
          thumb: [[1, 2], [2, 3], [3, 4]],
          index: [[5, 6], [6, 7], [7, 8]],
          middle: [[9, 10], [10, 11], [11, 12]],
          ring: [[13, 14], [14, 15], [15, 16]],
          pinky: [[17, 18], [18, 19], [19, 20]],
          palm: [[0, 1], [0, 5], [0, 17], [5, 9], [9, 13], [13, 17]]
        };
        const colors = {
          thumb: '#ef4444', index: '#f59e0b', middle: '#10b981', 
          ring: '#3b82f6', pinky: '#8b5cf6', palm: '#9ca3af'
        };

        const drawSegment = (landmarks, segment, color) => {
           ctx.strokeStyle = color;
           ctx.lineWidth = 2;
           ctx.beginPath();
           for (const [i, j] of segment) {
             ctx.moveTo(landmarks[i].x * w, landmarks[i].y * h);
             ctx.lineTo(landmarks[j].x * w, landmarks[j].y * h);
           }
           ctx.stroke();
        };

        for (const landmarks of handRes.landmarks) {
          for (const [part, lines] of Object.entries(connections)) {
            drawSegment(landmarks, lines, colors[part]);
          }
          
          // Draw points with Z-depth mapping (closer = bigger/brighter)
          for (const pt of landmarks) {
            const zOpacity = Math.min(1.0, Math.max(0.2, 1 - (pt.z * 5))); 
            const r = Math.max(2, 6 * zOpacity);
            ctx.fillStyle = `rgba(255, 255, 255, ${zOpacity})`;
            ctx.beginPath();
            ctx.arc(pt.x * w, pt.y * h, r, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    };

    const detectAndPredict = async () => {
      if (isPredictingRef.current) return;
      
      const now = performance.now();
      if (now - lastFrameTimeMs < 100) { // 10 fps to match 33 frames = 3.3 seconds
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
          drawLandmarks(handRes, faceRes);

          const keypoints = extractKeypoints(poseRes, handRes, faceRes);
          setDebugInfo(`Pose: ${poseRes.landmarks.length > 0} | Face: ${faceRes.faceLandmarks.length > 0} | Hands: ${handRes.landmarks.length}`);
          
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
             
             // Check if hands are present; if not, force idle
             if (handRes.landmarks.length === 0) {
                setCurrentSign("Waiting...");
                predictionsBufferRef.current = [];
             } else if (maxScore > 0.70 && actionsList.length > 0) {
                let action = actionsList[classIndex];
                if (questionFlag) action += "?";
                
                // Calculate average hand presence confidence
                let handConf = 0;
                handRes.handednesses.forEach(h => handConf += h[0].score);
                handConf /= handRes.handednesses.length;

                // Add to predictions buffer for rolling vote
                predictionsBufferRef.current.push({ sign: action, weight: handConf });
                if (predictionsBufferRef.current.length > 5) {
                  predictionsBufferRef.current.shift();
                }
                
                // Rolling majority vote weighted by hand confidence
                const counts = {};
                let totalWeight = 0;
                predictionsBufferRef.current.forEach(v => { 
                  counts[v.sign] = (counts[v.sign] || 0) + v.weight; 
                  totalWeight += v.weight;
                });
                
                let majoritySign = null;
                for (const [sign, weight] of Object.entries(counts)) {
                    // Require >60% of the total weighted buffer
                    if (weight > (totalWeight * 0.6)) majoritySign = sign;
                }
                                 
                setCurrentSign(action);
                
                if (majoritySign) {
                  if (majoritySign === "idle") {
                    setCurrentSign("idle...");
                    // We don't add idle to the sentence.
                  } else {
                    let curSentence = [...sentenceRef.current];
                    if (curSentence.length === 0 || curSentence[curSentence.length - 1] !== majoritySign) {
                      curSentence.push(majoritySign);
                      if (curSentence.length > 5) curSentence.shift();
                      sentenceRef.current = curSentence;
                      setSentence(curSentence);
                      
                      // Trigger LLM
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
             } else {
                 // Low confidence, reset buffer
                 predictionsBufferRef.current = [];
             }
          } else {
              setUiState("IDLE");
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
            <button 
              onClick={async () => {
                const testVideos = [
                  "bad_MVI_5162.MOV", "clothing_MVI_4896.MOV", "cow_MVI_3075.MOV", 
                  "deaf_MVI_9851.MOV", "flat_MVI_9624.MOV", "happy_MVI_5263.MOV", 
                  "light_MVI_9714.MOV", "sick_MVI_9444.MOV", "year_MVI_4637.MOV", "young_MVI_9429.MOV"
                ];
                let correct = 0;
                
                isPredictingRef.current = true; // PAUSE LIVE INFERENCE LOOP
                
                const v = videoRef.current;
                v.srcObject = null; // stop webcam
                
                for (const vid of testVideos) {
                  const trueClass = vid.split('_')[0];
                  setDebugInfo(`TESTING: ${vid} (expecting ${trueClass})`);
                  
                  v.src = `/test_videos/${vid}`;
                  v.loop = false;
                  sequenceRef.current = [];
                  predictionsBufferRef.current = [];
                  setCurrentSign("Testing...");
                  
                  // Wait for metadata to load duration
                  await new Promise(r => {
                     if (v.readyState >= 1) r();
                     else v.onloadedmetadata = r;
                  });
                  
                  const step = v.duration / 30;
                  const l = landmarkersRef.current;
                  
                  // Manually seek and extract exactly 30 frames to perfectly mimic training data
                  for (let i = 0; i < 30; i++) {
                    v.currentTime = i * step;
                    await new Promise(r => {
                      v.onseeked = r;
                    });
                    
                    const startTimeMs = performance.now();
                    const poseRes = l.pose.detectForVideo(v, startTimeMs);
                    const handRes = l.hand.detectForVideo(v, startTimeMs);
                    const faceRes = l.face.detectForVideo(v, startTimeMs);
                    
                    const keypoints = extractKeypoints(poseRes, handRes, faceRes);
                    sequenceRef.current.push(keypoints);
                  }
                  
                  // Now force a prediction on this perfect 30-frame buffer
                  const inputTensor = tf.tensor3d([sequenceRef.current], [1, 30, 258]);
                  const prediction = tfModelRef.current.predict(inputTensor);
                  const scores = await prediction.data();
                  inputTensor.dispose();
                  prediction.dispose();
                  
                  const maxScore = Math.max(...scores);
                  const classIndex = scores.indexOf(maxScore);
                  const predictedClass = actionsList[classIndex];
                  
                  console.log(`[DEBUG] Final sequence length for ${vid}: ${sequenceRef.current.length} | Confidence: ${maxScore.toFixed(2)}`);
                  
                  // If confidence is somewhat decent, consider it the prediction
                  let majoritySign = null;
                  if (maxScore > 0.40) {
                     majoritySign = predictedClass;
                  }
                  
                  const predicted = majoritySign ? majoritySign.replace('?', '') : 'none';
                  if (predicted === trueClass) correct++;
                  console.log(`[TEST] ${vid} | Expected: ${trueClass} | Got: ${predicted} | ${predicted === trueClass ? 'PASS' : 'FAIL'}`);
                }
                
                setDebugInfo(`TEST COMPLETE: ${correct}/${testVideos.length} correct. Check console for details.`);
                
                // Restore webcam
                navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                  v.src = "";
                  v.srcObject = stream;
                  v.play();
                  isPredictingRef.current = false;
                  detectAndPredict();
                });
              }}
              style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Run Sanity Test
            </button>
          </div>
        </section>

        <section className="controls-panel">
          <div className="data-panel">
            <h3>Raw Prediction</h3>
            <div className="translation-text">
              {currentSign.toUpperCase()}
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
