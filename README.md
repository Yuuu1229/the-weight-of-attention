# The Weight of Attention

**Final interactive build — Stages A–D**

_“Attention does not create information. It changes what becomes visible.”_

The Weight of Attention is an experimental generative artwork about selective
attention. It explores how concentrating on one area makes nearby information
clearer and more organized while peripheral information becomes less prominent.
The work is an artistic computational abstraction, not a scientific simulation
of cognition.

## Observed phenomenon

The field contains 240 persistent pieces of information: small alphanumeric
characters, geometric dots, and minimal symbols. Attention never creates new
marks or changes their identities. Instead, it redistributes visibility,
stability, and spatial emphasis across the existing field.

To focus on one thing is to let something else disappear.

## Computational thinking model

The system separates attention calculation from visual response.

The attention layer measures mouse position, movement velocity, spatial
tolerance, and dwell time. It maintains a current candidate, at most one
releasing focus, and one continuous effective output consisting of a position,
a strength bounded to `[0, 1]`, and a conceptual state.

The visual layer maps that effective output onto the fixed information field.
Elements near the focus become clearer, converge only partway toward the
attention center, and move more calmly. Peripheral marks fade toward a protected
minimum opacity. A bounded displacement and maximum attraction ratio preserve
spacing and prevent collapse into the cursor.

## Interaction states

- **Ambient:** The field drifts slowly without an active attention center.
- **Searching:** Mouse exploration creates weak awareness capped at `0.15`.
- **Focusing:** Stable dwell within a 20px tolerance builds toward full strength
  over approximately 1.5 seconds.
- **Release:** An abandoned focus decays over approximately two seconds while a
  new candidate can form independently.

Small movements inside the dwell tolerance preserve accumulated focus. Brief
speed spikes pause accumulation instead of resetting it. Hysteresis and a short
continuous handoff ensure that only one effective focus is exposed when an old
focus releases and a new one forms.

## Visual response

- Approximately 240 persistent elements: 60% characters, 30% dots, 10% symbols
- Background `#08090B` and marks `#E8E8E3`
- Slow unsynchronized ambient movement
- Focus radius of approximately 180px
- Maximum attraction ratio of `0.45`
- Maximum convergence displacement of 24px
- Minimum peripheral opacity of `0.10`
- No rings, spirals, glow, trails, sound, or cursor decoration

Reduced-motion mode freezes ambient and convergence movement while retaining
the clarity-based attention response.

## Technical stack

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas 2D
- No external runtime dependencies or build tools

## Run locally

Open `index.html` directly in a modern browser, or serve the directory with any
static file server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Development stages

1. **Stage A — Visual Foundation:** Composition, element identities, typography,
   responsive canvas, and ambient drift.
2. **Stage B — Attention Logic:** Pointer velocity, dwell, searching awareness,
   release, ownership hysteresis, and single-focus handoff.
3. **Stage C — Soft Convergence:** Local clarity, bounded convergence, peripheral
   fading, motion calming, and visual release.
4. **Stage D — Polish & Submission:** Logic simulation, browser regression,
   responsive checks, accessibility review, documentation, and deployment
   preparation.

## AI-assisted development process

Development used an AI-assisted workflow governed by frozen human-approved
design specifications. The process included repository inspection, staged
implementation plans, explicit scope boundaries, controlled-time logic
simulations, browser-based visual regression checks, and human review between
stages. AI assistance was used to implement and verify the approved behavior;
it did not independently redefine the artistic concept or interaction model.

## Known limitations

- Pointer timing and text rasterization can vary slightly between browsers and
  operating systems.
- The interaction is intentionally designed for a primary desktop mouse;
  touch and pen input are ignored.
- The canvas is a visual artwork rather than individually navigable semantic
  content. An artwork-level accessible description is provided.
- Device-specific performance and browser compatibility should still be
  evaluated on the final exhibition hardware.
