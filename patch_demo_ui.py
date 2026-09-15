with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

old_header = '''    <div className="app-container" style={{ border: '2px solid #a855f7' }}>
      <header className="app-header">
        <div className="brand">
          <div className="logo-box" style={{ background: '#a855f7' }}>D</div>
          <div className="logo-container">
            <h1>SignAI</h1>
            <p>Real-time Translation Pipeline</p>
          </div>
        </div>
        <div className="status-badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid #a855f7' }}>
          <span className="dot" style={{ backgroundColor: '#a855f7' }}></span> OFFLINE DEMO
        </div>
        <button className="btn" onClick={onExit} style={{ marginLeft: 'auto', background: '#333' }}>Exit Demo</button>
      </header>'''

new_header = '''    <div className="app-container">
      <header>
        <div className="logo-container">
          <h1>SignAI</h1>
          <p>Real-time Translation Pipeline</p>
        </div>
        <div className={`ui-state-badge ACTIVE`}>
          <div className="ui-state-indicator"></div>
          ACTIVE
        </div>
        <button className="btn" onClick={onExit} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'transparent' }}>x</button>
      </header>'''

content = content.replace(old_header, new_header)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("Demo UI replaced!")
