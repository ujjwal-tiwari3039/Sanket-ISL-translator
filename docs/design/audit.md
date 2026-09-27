# Frontend audit and direction

Inspected App.jsx, DemoMode.jsx, main.jsx, both CSS files, Vite plugin, generated
landing/docs and package manifest. Live camera/inference and demo own separate
lifecycles. Static introduction and documentation are rendered by discoverability.mjs;
therefore changing only React would leave the public page inconsistent. Existing
black workspace, camera-first layout and explicit scripted labeling are useful.
Weaknesses: generic intro, repeated headings, scattered blue/green/orange controls,
no unified focus/motion rules, remote fonts, eager ML/camera boot on page visit,
small mobile controls and disconnected documentation styling.

## Supplied reference
Inspected uploads/ui.mp4 (85.18 seconds) using a contact sheet sampled every ten
seconds. Visuals show Taste Skill, web-design-guidelines, awesome-design-md and
image/reference-driven design examples. Audio was not transcribed. This is a
workflow reference, not an instruction to copy the sneaker or blue websites.
Adapt the use of concise skills, source-of-truth tokens and critique/render cycles.
Keep source-specific mascots, brands, layouts and plugin commands out of Sanket.

Conceptual sources inspected, not copied:
- https://github.com/tasteskill/tasteskill — specificity and visual critique.
- https://vercel.com/design/guidelines — interaction, accessibility and rendered checks.
- https://github.com/VoltAgent/awesome-design-md — portable design documentation.

## Decision
Warm editorial public surface plus dark functional studio. A custom annotated
landmark drawing connects communication to measurement. Technical trust comes
from source, model scope and limitations rather than customer logos or claims.
Native CSS motion, system fonts and SVG avoid new runtime dependencies. Defer
ML application import until launch; preserve all existing inference internals.

## Implementation decisions

- `scripts/landing.mjs` owns the static editorial composition; discoverability.mjs
  retains metadata, publication policy, docs and links. No JS is required for the
  narrative, diagram or technical documentation.
- `Workspace.jsx` is a small launch boundary. Dynamic import defers existing App
  and its ML dependencies. Unmounting still invokes the existing camera cleanup.
- Camera and canvas retain identical mirroring; object-fit contains the camera
  instead of cropping it. No landmarks, model math, thresholds or backend changed.
- Existing demo publication restrictions remain: local demo control in development,
  setup link in the production launcher, no redistributed presentation footage.
- Global Space previously hijacked focused controls. It now ignores native inputs,
  buttons, links and editable fields, repeats, and an unloaded model. Browser
  regression uses Space to activate the demo button and checks camera cleanup.
- System font stacks remove remote font fetches. Original inline SVG costs no
  image request; no WebGL or animation library was justified. Motion stays at
  micro-interaction level and respects reduced motion.
