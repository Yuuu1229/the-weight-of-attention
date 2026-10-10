# The Weight of Attention

**Live website:** https://yuuu1229.github.io/the-weight-of-attention/

**Main idea:** Attention does not create information. It changes what becomes
visible.

The Weight of Attention is an interactive artwork about selective attention.
When the mouse stays in one place, nearby information becomes larger, clearer,
and calmer. Information farther away becomes darker. When the mouse moves away,
the old focus slowly disappears and the full field returns.

## The phenomenon

The phenomenon I chose is selective attention. People cannot give equal
attention to everything at the same time. When one area becomes important,
other information can feel less visible.

The artwork uses 240 letters, numbers, dots, and symbols to show this idea. The
marks always keep the same identity. Attention does not add new information. It
only changes what the viewer can see clearly.

## Computational thinking

I broke the idea into four parts:

1. **Information:** a field of fixed letters, numbers, dots, and symbols.
2. **Attention:** the mouse position, mouse speed, and time spent in one area.
3. **Focus:** nearby marks become clearer, larger, closer, and calmer.
4. **Release:** the focus fades when the mouse moves away.

I found these patterns:

- Fast mouse movement means the viewer is still searching.
- A slow or still mouse means the viewer may be focusing.
- Focus needs time to grow.
- A new focus should replace the old one smoothly.
- Making one area clearer should make the rest of the field quieter.

I removed details that were not needed. This is not a scientific model of the
brain. It is a visual model with one attention point, one focus strength, and a
field of information.

### Simple algorithm

```text
Create 240 marks and keep their identities.

For every animation frame:
  Read the mouse position and speed.
  If the mouse is moving fast, show a weak local response.
  If the mouse stays in one area, build focus for 1.5 seconds.
  Find the closest character to the mouse.
  Make that character the largest and clearest mark.
  Move nearby marks partway toward the mouse.
  Make nearby motion calmer.
  Make distant marks darker.
  If the mouse leaves, release the focus for about 2 seconds.
```

## Design choices

- Black background: `#08090B`
- Warm white marks: `#E8E8E3`
- 60% letters and numbers, 30% dots, and 10% symbols
- Mixed serif, script, and monospace type
- Slow movement and large empty spaces
- No color, glow, sound, mouse trail, spiral, or fixed center

The design is quiet when the viewer is not interacting. The mouse does not pull
everything into one point. Nearby marks only move partway. The closest character
grows to about 88px, becomes fully visible, turns upright, and is drawn above the
other marks. This makes the mouse position the clearest piece of information.

## Interaction

- **Ambient:** The field moves slowly with no focus.
- **Searching:** Moving the mouse creates a small local response.
- **Focusing:** Staying near one point for about 1.5 seconds builds a strong
  focus.
- **Release:** Moving away makes the old focus fade over about 2 seconds.

## How I used AI

I used AI as a coding partner, but I made the final design decisions.

At first, I asked AI to make the interaction more visible and the type larger.
I checked the result several times and said when it was still too small or not
smooth enough.

Later, I shared a visual reference. AI copied the reference's circular layout,
but that changed my idea. I explained that I only wanted the type style, size
contrast, and black-and-white feeling. I did not want a circle in the center.
This correction was important because the artwork is about attention following
the mouse, not about a fixed shape.

I then asked for the information at the exact mouse position to become the
clearest. AI added a rule that selects the closest character. I tested it in the
browser and noticed that other large letters could cover it. The final version
draws the main character last, turns it upright, and makes nearby secondary
information slightly darker.

This process showed me that AI can make code quickly, but it cannot decide if a
visual result communicates my idea. I had to compare each version with the
concept, find the problems, and ask for specific changes.

## Code

- `index.html` creates the page and Canvas.
- `style.css` sets the full-screen layout and small text labels.
- `script.js` creates the marks, tracks attention, updates movement, and draws
  every frame.
- Canvas 2D draws the whole artwork.
- The project uses plain HTML, CSS, and JavaScript with no outside libraries.

The code keeps attention logic separate from drawing logic. This made it easier
to test the 1.5-second focus, 2-second release, smooth handoff, and visual
response as different parts.

## What I learned

Computational thinking helped me turn a difficult idea into small rules. The
most useful rule was not “make particles follow the mouse.” It was “make one
area easier to read while other areas lose importance.” That rule kept the code
connected to the phenomenon.

The failed circle version also helped me understand the difference between
copying a visual style and copying a composition. Testing the work in the
browser helped me see problems that were not clear from code alone, such as
small text, rough handoffs, overlap, and a focus area that looked like a ring.

## How to run it

Open `index.html` in a modern browser, or run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Known limits

- The interaction is designed for a desktop mouse.
- Touch and pen input are not included.
- Font shapes can look a little different on different computers.
- Reduced-motion settings stop the drifting and pulling motion, but keep the
  clarity response.
