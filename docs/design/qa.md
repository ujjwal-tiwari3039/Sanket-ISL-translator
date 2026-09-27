# Design verification — 2026-09-27

## Evidence and method

Reviewed the rendered page in isolated headless Chromium/Brave at 1440×1000,
768×1000, 390×1000 and 320×1000. Full-page screenshots cover hero, approach,
pipeline, model scope, launch/workspace and footer. Additional screenshots inspect
live controls, camera denial and mobile documentation. Camera testing uses the
browser's synthetic source; physical signing trials remain paused.

- [Before desktop](evidence/before-desktop.png)
- [After desktop](evidence/after-desktop.png)
- [After mobile](evidence/after-mobile.png)
- [Live mobile](evidence/live-mobile.png)
- [Production interaction results](evidence/browser-results.json)
- [Performance observations](evidence/performance.json)

Visual iteration caught stale dev-plugin CSS (restart required), a missing space
at a mobile heading break, a squeezed spelling field, and inconsistent action
colors. Corrected and rerendered. Camera containers now adopt source aspect ratio
on metadata load so the image and overlay share the same uncropped geometry.

## Results

- No horizontal overflow at all four widths; one h1; coherent tablet/mobile stacking.
- Production: model initializes after launch; spelling Ujjwal adds UJJWAL to the
  context; mobile controls remain within viewport; camera-denied error is visible;
  docs have no horizontal page overflow (code has its own scroll area).
- Keyboard Tab reaches the visible skip link. Space on the demo button activates
  that button rather than arming capture. Input/select/editable fields and key
  repeats are excluded from the capture shortcut.
- Synthetic camera lifecycle passes: landing starts no stream, live launch opens
  one, demo entry closes it, return opens a fresh stream, workspace close ends it.
- Reduced-motion preference is exercised. CSS removes animations/transitions and
  smooth scrolling. No ambient animation, scroll hijack, 3D or shader load exists.
- Color contrast ratios: ink/paper 13.91, secondary/paper 5.63, accent/paper 5.75,
  studio text/canvas 14.45, studio muted/canvas 9.01, secondary button text/fill 10.72.
  This is a token-pair spot check, not an exhaustive accessibility audit.
- Lint: zero warnings. Four frontend test files pass. Production build passes with
  existing deferred ML chunk-size warning. Discoverability: 24 pages, 537 internal
  links, 147 repository documentation links, model/label and publication checks pass.

## Performance

Build: initial JS approximately 194 KB / 61.5 KB gzip, versus approximately
1,232 KB / 332 KB gzip before the launch boundary. Deferred ML workspace is about
1,044 KB / 274 KB gzip. No dependencies added. No remote font loading. Hero is
inline original SVG; it adds no image request or layout uncertainty. The legacy
social preview and docs screenshot remain publication assets, not hero downloads.

Local production observations, unthrottled Chromium, 2-second initial windows:
CLS 0 at all four widths; LCP 32–52ms; DOMContentLoaded 14–48ms. A 60-frame idle
sample averaged 16.67ms. These local/cache-sensitive numbers are not field Core
Web Vitals, mobile hardware inference FPS, or slow-network guarantees. Full raw
resource inventory is saved in performance.json; the landing does not load App
or MediaPipe models before launch. Heavy ML still incurs its existing runtime cost.

## Skills

Seven skill folders validated with the bundled quick_validate.py using the
existing venv (system Python lacks PyYAML). Native frontmatter and invocation
metadata are present. Fresh read-only Codex sessions tested actual local discovery:

- [Explicit invocation output](evidence/explicit-skills.txt): all seven `$name`
  invocations read the corresponding SKILL.md and identified relevant boundaries.
- [Implicit routing output](evidence/implicit-skills.txt): all 14 cases matched
  the expected seven positive and seven negative outcomes.

See [routing cases](skill-evaluation.md). This bounded evaluation does not claim
perfect future routing. Existing Codex sessions may need restarting to refresh
new skill discovery.

## Reproduction

```bash
npm --prefix apps/frontend run lint
npm --prefix apps/frontend test
npm --prefix apps/frontend run build
npm --prefix apps/frontend run check:discoverability
npm --prefix apps/frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm --prefix apps/frontend run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Use an isolated synthetic-camera browser (never a personal browser profile):

```bash
brave-origin --headless=new --no-sandbox --disable-dev-shm-usage --enable-unsafe-swiftshader --use-angle=swiftshader --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --remote-debugging-port=9223 --user-data-dir=/tmp/sanket-design-browser about:blank
node tests/frontend/browser-smoke.mjs
QA_URL=http://127.0.0.1:4173/ QA_INTERACTIONS=1 node scripts/maintenance/visual-qa.mjs /tmp/sanket-qa
```

The visual script produces evidence for inspection, not an automatic aesthetic
pass/fail score. Restart Vite after editing static publication CSS/templates,
which are inventoried at server startup. Production demo remains a local-setup
link because its footage is intentionally excluded from publication.

## Remaining checks

No Safari/Firefox or physical mobile-device pass, screen-reader audit, slow-network
field test, or real-camera regression was run during this design task. Error
state was deliberately simulated. Training, calibration and physical trials were
not resumed. No backend, model weights or inference threshold was changed.

Local demo inspection also passed: prerecorded footage renders with the overlay,
scripted-output labeling stays visible, and exit returns to live mode. See
[local browser results](evidence/local-browser-results.json) and
[demo mobile screenshot](evidence/demo-mobile.png). The desktop/mobile landing
screenshots represent the final composition; the last patch added a model-loading
message and source-aspect-ratio binding without changing the landing composition.

## Separate translation page

Landing now contains no React mount or application script. `/translate/` is a
separate Vite HTML entry, supports direct refresh and contains the existing
explicit camera launch. Debug controls remain query-gated at
`/translate/?landmarkDebug`. Publication checks cover both entries (25 pages,
552 internal links); no router dependency was added.

## Larger translator workspace — 2026-09-28

Scoped the separate translation page to a 1600px maximum workspace with 32px
desktop margins, a compact introduction, and a 2:1 camera/control split. Smaller
viewports retain stacked layouts and 20px/12px margins. Landing styling is unchanged.
Inspected production screenshots at 1440, 768, 390 and 320px, including live
synthetic-camera controls. Evidence: `evidence/wider-translator-desktop.png`.
Build, lint and 25-page publication checks pass. Recognition and capture logic
were not modified.

Further workspace expansion: reduced desktop margins to 16px, raised maximum
width to 1920px, and allocated remaining width to the camera beside a 360px
control column. Compacted navigation/title/workspace headers without removing
controls. Production build and lint pass; landing page remains unaffected.

## Refined dark mode

Shared static theme initializer selects system preference before stylesheet paint,
then saves explicit light/dark choices. Navigation toggle is keyboard accessible;
styles include diagrams, documentation, raised surfaces, rules and public actions.
The live camera palette remains stable. Regression tests cover system defaults,
toggling, persistence, invalid/blocked storage and cross-tab preference changes.
All five frontend test files, lint, build and 25-page/577-link publication checks
pass. Dark landing inspected at 1440/768/390/320px: no horizontal overflow or
uncaught exceptions. Evidence: `evidence/dark-desktop.png`, `evidence/dark-mobile.png`.
