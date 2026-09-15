with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

# Fix the timestamp logic to handle short videos
old_logic = '''        const w = entry.words[i];
        const start = w.timestamp - 1.5; // Start capturing 1.5s before
        const end = w.timestamp;'''

new_logic = '''        const w = entry.words[i];
        const duration = video.duration && !isNaN(video.duration) ? video.duration : 2.0;
        const targetTime = Math.min(w.timestamp, duration - 0.2); // Trigger slightly before video ends if short
        const start = Math.max(0, targetTime - 1.5);
        const end = targetTime;'''

content = content.replace(old_logic, new_logic)

# Fix video playback autoplay (add autoPlay to video tag)
content = content.replace('<video \n              ref={videoRef}\n              className="video-feed"\n              playsInline\n              muted', 
'<video \n              ref={videoRef}\n              className="video-feed"\n              autoPlay\n              playsInline\n              muted\n              loop={false}')

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode logic updated!")
