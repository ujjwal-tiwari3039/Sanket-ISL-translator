import { lazy, Suspense, useState } from 'react';

const Translator = lazy(() => import('./App.jsx'));

export default function Workspace() {
  const [mode, setMode] = useState(null);

  if (mode) {
    return <>
      <div className="workspace-toolbar">
        <span>TRANSLATOR / WORKSPACE</span>
        <button onClick={() => setMode(null)}>Close workspace ×</button>
      </div>
      <Suspense fallback={<div className="workspace-loading" role="status">Loading the recognition workspace…</div>}>
        <Translator initialDemo={mode === 'demo'} />
      </Suspense>
    </>;
  }

  return (
    <section className="workspace-launch" aria-label="Open translation workspace">
      <div>
        <span className="eyebrow">YOUR CAMERA. YOUR WORDS.</span>
        <h2>Ready when<br />you are.</h2>
        <p>Camera access starts only when you open the live workspace. Nothing to record? Explore the scripted demo.</p>
        <div className="hero-actions">
          <button className="action-primary" onClick={() => setMode('live')}>Start live translation ↗</button>
          {import.meta.env.PROD ? (
            <a className="action-secondary" href="/docs/installation/">Run the demo locally →</a>
          ) : (
            <button className="action-secondary" onClick={() => setMode('demo')}>Explore demo →</button>
          )}
        </div>
        <p className="launch-note">Browser recognition · Local service required for English sentences</p>
      </div>
      <div className="launch-instructions">
        <span>BEFORE YOU BEGIN</span>
        <ol>
          <li>Face the camera in good light.</li>
          <li>Keep both hands and shoulders visible.</li>
          <li>Record one sign at a time.</li>
        </ol>
        <a href="/docs/installation/">Setup & camera requirements ↗</a>
      </div>
    </section>
  );
}
