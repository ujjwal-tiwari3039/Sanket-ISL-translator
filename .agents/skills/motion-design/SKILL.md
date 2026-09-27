---
name: motion-design
description: Design reusable motion tokens or purposeful UI transitions for Sanket. Not for arbitrary decoration or unrelated frontend edits.
---

Read DESIGN.md and inventory existing dependencies. Level 1 micro motion communicates interaction or state; prefer CSS opacity/transform. Level 2 section motion must explain continuity and preserve native scrolling. Level 3 hero/3D requires a storytelling and measured performance justification, never a site-wide default. Give every animation a reason and remove it if clarity improves without it. Define fast/medium/slow durations, easing and reduced-motion alternatives. Avoid transition:all, perpetual decorative loops, scroll hijacking and layout animation. Verify interruption, keyboard behavior and reduced motion in the browser.
