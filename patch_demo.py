import re

with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

# Replace drawOverlay
start_idx = content.find('  const drawOverlay = (poseResult, handResult) => {')
if start_idx == -1:
    print("Could not find drawOverlay start")
    exit(1)

with open('frontend/src/App.jsx', 'r') as f:
    app_content = f.read()

app_draw_start = app_draw_start = app_content.find('    const drawOverlay = (poseRes, handRes, faceRes) => {')
if app_draw_start == -1:
    # try another format
    app_draw_start = app_content.find('const drawOverlay = (poseRes, handRes, faceRes) => {')

# Find the end of drawOverlay in App.jsx (matching braces)
app_draw_end = -1
brace_count = 0
started = False
for i in range(app_draw_start, len(app_content)):
    if app_content[i] == '{':
        brace_count += 1
        started = True
    elif app_content[i] == '}':
        brace_count -= 1
        if started and brace_count == 0:
            app_draw_end = i + 1
            break

app_draw_code = app_content[app_draw_start:app_draw_end]

# Make sure DemoMode imports what it needs (it does, but I'll add showFaceMesh state)
content = content.replace('const [recordingProgress, setRecordingProgress] = useState(0);', 
'''const [recordingProgress, setRecordingProgress] = useState(0);
  const [showFaceMesh, setShowFaceMesh] = useState(false);
  const smoothedFaceRef = useRef(null);
  const smoothedHandsRef = useRef([]);''')

content = content.replace('const hRes = hand.detectForVideo(video, performance.now());\n        drawOverlay(pRes, hRes);',
'''const hRes = hand.detectForVideo(video, performance.now());
        const fRes = landmarkersRef.current.face ? landmarkersRef.current.face.detectForVideo(video, performance.now()) : null;
        drawOverlay(pRes, hRes, fRes);''')

# Now replace the drawOverlay function in DemoMode
new_content = content[:start_idx] + app_draw_code + "\n\n"

# But wait, where is the rest of DemoMode after drawOverlay?
# It's '  const handleNext = () => {'
next_idx = content.find('  const handleNext = () => {')
new_content += content[next_idx:]

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(new_content)

print("DemoMode patched!")
