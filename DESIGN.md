# Sanket — design source of truth

## Brand
An open engineering workspace for Indian Sign Language recognition. Human movement
is the subject; technical clarity is the evidence. Editorial, precise and approachable.
Never invent company clients, certifications, recognition accuracy or production readiness.

## Typography
System sans (`Arial`, `Helvetica`, sans-serif) for direct, compact headlines and body;
system monospace for coordinates, section numbering and status. No remote fonts.
Display clamp 48–100px / .98, heading 32–56 / 1.06, subhead 24 / 1.2,
body 17 / 1.65, label 11 / 1.4 uppercase tracked .12em, caption 13 / 1.5.
Body measure <=65ch. Display size follows composition, not a blanket size rule.

## Colors
Paper #f3f0e8; white #fffdf8; ink #19251f; secondary #556259;
accent vermilion #a63820, accent surface #e6ddcf; hairline #c9cdc3.
Studio canvas #14221d, surface #1c2d25, text #f3f0e8, muted #b6c3b9;
ready #b6d997, active #ffd180, error #ffb4a3. Semantic states always include text.

## Grid and spacing
Public container 1280px, 48px desktop / 24px tablet / 20px mobile gutters.
Editorial 12-column logic with hero 7:5, narrative 1:2; studio 3:2.
Spacing 4,8,12,16,24,32,48,64,96. Breakpoints 1000 and 640px.
Use rules and shared surfaces rather than nested floating cards.

## Components
Square structural panels, 2px control corners, no pill system. Borders 1px solid.
No default box shadows. Primary action solid ink, secondary underlined text.
44px minimum controls, visible 2px accent focus with 4px offset. Consistent
button labels and explicit loading/error/disabled states. Camera permission
belongs to an explicit launch action; keep demo distinctly labeled scripted.
Inputs remain labeled. Recognition, context and English output are separate stages.

## Motion
Fast 140ms, medium 240ms, slow 480ms; ease cubic-bezier(.2,.7,.2,1).
Only hover/pressed feedback and state changes. No ambient loops or scroll hijack.
Reduced motion removes decorative transitions and smooth scrolling. Camera
landmarks are functional visualization, not decorative animation.

## Imagery and iconography
Original SVG landmark study, marked illustrative (not a sign instruction or real
inference). No stock AI brains, gradients, floating blobs or fabricated scores.
Use small directional arrows and a simple geometric brand mark; text labels carry meaning.

## Responsive rules
Desktop uses asymmetry and broad whitespace; tablet compacts grids; mobile stacks
hero art after copy, wraps navigation, makes actions touch-friendly, and keeps
all controls available. Camera/canvas dimensions and matching mirroring must stay intact.

## Accessibility
One page h1, logical headings, skip link, native links/buttons, polite output
announcements, no autoplay camera on landing, no color-only feedback. Test at
320/390/768/1440px, keyboard and reduced motion. Keep technical docs readable
without the JS application. Do not assert WCAG certification from spot checks.

## Do / don't
Do show the actual workflow, vocabulary scope and limitations. Do use typography,
composition and a recognizable landmark motif. Don't copy references, add testimonial
fiction, bury errors, redesign ML semantics, or add motion dependencies without need.

The standalone `/translate/` page uses a compact introduction and a workspace
up to 1600px wide, with 32px desktop, 20px tablet and 12px mobile margins.
Desktop camera/controls use a 2:1 split with a 360px minimum control column;
tablet/mobile stack. These rules do not apply to the editorial landing page.

Expanded workspace refinement: desktop width now reaches 1920px with 16px side
margins; the controls retain 360px and the camera receives the remaining width.
Navigation, title and workspace headers are compact to prioritize the camera.
Tablet/mobile still stack with their existing comfortable gutters.

## Dark theme
System preference is the initial default; the navigation toggle saves an explicit
light/dark choice locally across routes. Dark public surfaces use warm charcoal
#151c19, ivory #ecebe3, muted text #b6bdb3, coral #ed997e, rules #3b4940 and raised
surfaces #202c24. The camera workspace retains its functional dark colors in both
themes. Theme initialization runs before paint; storage denial must not break it.
