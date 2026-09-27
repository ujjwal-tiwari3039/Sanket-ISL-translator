# Interface review checklist
- Typography: display, heading, subhead, body, label, technical and caption roles; two family categories maximum; readable measures and line heights.
- Layout: shared edges, responsive grid, intentional whitespace, distinct section rhythm; test long output and 320px.
- Color: canvas, ink, accent and semantic roles; measure normal text 4.5:1, large text and essential UI 3:1; do not rely on color alone.
- Components: clear primary/secondary buttons; keyboard navigation; explicit form labels; cards only for grouped tasks; readable tables; native disclosure before modals; useful footer links.
- States: hover, visible focus, pressed, loading, disabled, error, success and empty states; actions must preserve task context.
- Motion: explain entrance/transition/hover/scroll/state purpose; reduced-motion removes nonessential movement.
- Accessibility: semantic landmarks and heading order, keyboard operation, focus recovery, screen-reader names, zoom, reduced motion.
- Performance: dimensioned optimized images, defer below-fold media, no unnecessary font requests, measure bundles and layout shifts; avoid GPU-heavy decoration.
