with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

old_debug = '''          <div className="info-text">
            <span>[DEBUG] {currentIndex + 1}/{manifest.length} | {debugStr}</span>
            <label style={{ marginLeft: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={showFaceMesh} 
                onChange={(e) => setShowFaceMesh(e.target.checked)} 
              />
              Show Face Mesh
            </label>
            <button className="btn" onClick={handleReplay} style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem' }}>Replay</button>
            <button className="btn" onClick={handleNext} style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem' }}>Next Demo</button>
          </div>'''

new_debug = '''          <div className="info-text" style={{ visibility: 'hidden', height: '0', padding: '0' }}>
            <button id="nextDemoBtn" onClick={handleNext}>Next</button>
          </div>'''

content = content.replace(old_debug, new_debug)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("Demo debug UI hidden!")
