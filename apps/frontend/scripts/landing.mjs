// Original editorial composition; illustrative landmark study, not sign instruction.
export function landing() {
 const points=[[210,380],[154,325],[109,283],[73,251],[47,226],[160,257],[143,192],[132,135],[127,88],[204,241],[201,163],[200,104],[202,52],[245,248],[260,179],[270,126],[280,80],[279,271],[312,227],[334,190],[355,160]];
 const chains=[[0,1,2,3,4],[0,5,6,7,8],[5,9,13,17,0],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
 const lines=chains.map(c=>`<polyline points="${c.map(i=>points[i].join(',')).join(' ')}"/>`).join('');
 const nodes=points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="4"/><text x="${x+9}" y="${y-7}">${String(i).padStart(2,'0')}</text>`).join('');
 return `<section class="discovery-home" aria-labelledby="project-title">
 <div class="hero-copy"><p class="eyebrow">SANKET / INDIAN SIGN LANGUAGE</p>
 <h1 id="project-title">Meaning starts<br>with <em>movement.</em></h1>
 <p class="hero-intro">A gesture. A word. A connection.<br>Sanket explores how Indian Sign Language can become written English—with computer vision, right in your browser.</p>
 <div class="hero-actions"><a class="action-primary" href="/translate/">Open the translator <span aria-hidden="true">↗</span></a><a class="text-link" href="/docs/how-it-works/">See how it works <span aria-hidden="true">→</span></a></div>
 <p class="hero-footnote"><span class="status-dot"></span> Research in motion. Built to be inspected.</p></div>
 <figure class="landmark-study"><div class="figure-top"><span>FIG. 01 / A LANGUAGE OF MOVEMENT</span><span>ISL</span></div>
 <svg viewBox="0 0 420 440" role="img" aria-labelledby="study-title"><title id="study-title">Illustrative hand landmark diagram with 21 indexed points, not a sign instruction</title>
 <defs><pattern id="study-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="var(--line)" stroke-width=".5"/></pattern></defs>
 <rect width="420" height="440" fill="url(#study-grid)"/><circle cx="210" cy="230" r="166" fill="none" stroke="var(--line)" stroke-dasharray="3 7"/>
 <g fill="none" stroke="var(--accent)" stroke-width="2">${lines}</g><g fill="var(--ink)" font-family="monospace" font-size="9">${nodes}</g>
 <path d="M12 12h20M12 12v20M408 428h-20M408 428v-20" fill="none" stroke="var(--ink)"/></svg>
 <figcaption><strong>Human expression.<br>Machine-readable motion.</strong><span>21 points / one hand<br>Illustrative landmark study</span></figcaption></figure>
 </section>
 <section class="method-strip" aria-label="Recognition pipeline"><span>THE TRANSLATION PATH</span><p>Movement <b>→</b> Landmarks <b>→</b> Recognition <b>→</b> English</p></section>
 <section class="editorial-section" id="approach" aria-labelledby="approach-title"><div><p class="eyebrow">01 / THE APPROACH</p><p class="section-aside">A visible process.<br>Not a black box.</p></div><div><h2 id="approach-title">From what you express<br>to what others can read.</h2><p>Sign languages carry their own grammar, nuance and identity. Sanket is a focused experiment in recognizing selected ISL signs—not a replacement for an interpreter.</p><div class="method-rows"><div><span>01</span><h3>See the movement</h3><p>Your camera captures pose and hand landmarks. Recognition runs in the browser.</p></div><div><span>02</span><h3>Find the word</h3><p>A temporal model reads the gesture sequence and predicts a word from its vocabulary.</p></div><div><span>03</span><h3>Build the sentence</h3><p>Recognized words form a sequence. A separate local language service turns it into English.</p></div></div></div></section>
 <section class="evidence-band" aria-label="Model scope"><div><strong>263</strong><span>labels in the shipped vocabulary</span></div><p>Open about the engineering.<br>Honest about the limits.</p><a class="text-link" href="/docs/evaluation/">Read the evaluation notes ↗</a><p class="evidence-note">Recognition varies with the sign, signer and capture conditions. Vocabulary size is not an accuracy claim.</p></section>
 <section class="studio-intro" aria-labelledby="studio-title"><div><p class="eyebrow">02 / THE WORKSPACE</p><h2 id="studio-title">Make yourself <br>understood.</h2></div><p>Try a supported sign with your camera, inspect the recognized word, then build a sequence. Start with good lighting and keep your hands and shoulders in frame.<br><a class="action-primary" href="/translate/">Open the translator ↗</a> <a class="text-link" href="/docs/vocabulary/">Supported vocabulary ↗</a></p></section>`;
}
