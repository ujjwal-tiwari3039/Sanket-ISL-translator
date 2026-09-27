# Durable project rules

Preserve apps/frontend, apps/backend, ml, models, data, docs and tests separation.
For visual work, consult DESIGN.md and the applicable focused skills in
.agents/skills; do not load every design skill for every frontend task.
Inspect the rendered page before declaring visual work complete. Keep design
verification evidence in docs/design. Skills are invoked as $skill-name; keep
routing descriptions narrow and evaluate them with docs/design/skill-evaluation.md.
Preserve landmark ordering, normalization, model input, inference thresholds,
camera cleanup and live/demo separation during design changes. Do not replace
weights or restart paused validation trials as a side effect of UI work.
Never invent company credentials, accuracy claims, or production/offline guarantees.
Preserve publication allowlists and independent static documentation routes.
