# The Weight of Attention

**Current version: Stage A — Visual Foundation**

_“Attention does not create information. It changes what becomes visible.”_

The Weight of Attention is an experimental generative artwork about selective
attention. It considers how concentration changes the visibility and apparent
organization of an information field. The work is an artistic abstraction, not
a scientific simulation of cognition.

Stage A presents a passive, full-screen field of small characters, geometric
dots, and minimal symbols. The marks drift slowly over a near-black background,
forming a quiet ambient system that can be observed but not yet influenced.

## Technical stack

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas 2D
- No external runtime dependencies

## Run locally

Open `index.html` directly in a modern browser, or serve the directory with any
static file server. For example:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Development roadmap

1. **Stage A — Visual Foundation:** Full-screen composition, typographic and
   geometric marks, and passive ambient drift. **Implemented.**
2. **Stage B — Attention Logic:** Pointer position, movement velocity, dwell
   time, and continuous attention-state transitions.
3. **Stage C — Soft Convergence:** Controlled local convergence, clarity,
   peripheral fading, spacing preservation, and release behavior.
4. **Stage D — Polish & Submission:** Cross-browser testing, visual refinement,
   documentation, and deployment.

## Stage A boundaries

The current version intentionally does **not** include mouse tracking, dwell
detection, attention calculations, attraction, convergence, peripheral fading,
focus or release transitions, click interactions, sound, or debug controls.
The instruction in the editorial overlay anticipates the later interactive
stages; mouse movement has no effect in Stage A.
