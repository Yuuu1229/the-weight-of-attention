# The Weight of Attention

**Live website:** https://yuuu1229.github.io/the-weight-of-attention/

**GitHub:** https://github.com/Yuuu1229/the-weight-of-attention

The Weight of Attention is an interactive generative art project about
selective attention. It was made with HTML, CSS, JavaScript, and Canvas 2D.

## What I observed

I chose attention as the phenomenon. In daily life, when I focus on one thing,
that thing becomes clearer, but other things around it feel less important.

For example, when I read on my laptop in a noisy space, I may focus on one
sentence and stop noticing other visual details around me. The other
information is still there, but I do not give it the same attention.

## My project

The Weight of Attention is an interactive artwork. The screen has 240 letters,
numbers, symbols, and dots. They move slowly on a dark background and represent
information around us. The mouse represents the viewer's attention.

When the mouse moves, nearby marks respond a little. When the mouse stays in
one area, focus builds for about 1.5 seconds. Nearby marks become clearer,
larger, closer, and calmer. Marks farther away become darker. When the mouse
moves away, the old focus fades for about 2 seconds.

The marks do not collapse into the mouse. They move only part of the way, so
the effect stays soft. The closest character becomes the largest and clearest
piece of information.

My main idea is that focusing on one thing also means letting something else
disappear from our attention.

This is an artistic model, not a scientific model of the brain.

## Computational thinking

I broke attention into smaller parts: mouse position, mouse speed, time in one
area, distance from the mouse, focus strength, movement, size, and opacity.

I noticed a pattern. Fast movement feels like searching. Staying in one place
feels like focusing. Focus should grow slowly, and it should also leave slowly
when attention moves somewhere else.

I simplified the idea into one attention point, one focus value from 0 to 1,
and a field of information. The program repeats these steps:

1. Read the mouse position and speed.
2. Check how long the mouse stays in one area.
3. Increase or decrease the focus value.
4. Make nearby information clearer and slightly closer.
5. Make the closest character the clearest mark.
6. Make distant information quieter.
7. Return the field slowly when focus ends.

These small rules create a more complex visual result.

## How I used AI

I used ChatGPT as a thinking partner and Codex to help with development. At the
beginning, I compared ideas about hesitation, communication, memory, and
attention. I chose selective attention because it could become a clear visual
system without very complicated code.

AI helped me turn the idea into variables and rules, but I made the final
design decisions. I tested every version in the browser and explained what was
not working.

One of my first comments was: **"The overall effect should be more obvious. The
numbers are too small, and the motion is not smooth enough."** We made the type
larger and improved the movement several times.

Later, I shared a black-and-white typography image as a style reference. AI
copied its circle shape, but I did not want a fixed circle. I said: **"There
should not be a circle in the center. The information should gather around the
mouse. I only wanted the style."** We removed the fixed center and changed the
focus range so the edge did not look like a ring.

I also asked: **"The character at the mouse should grow automatically and
become the clearest information."** The code then selected the closest
character. During testing, I found that other letters could cover it, so the
final version draws that character last and turns it upright.

This process showed me that AI can produce code quickly, but it cannot decide
if the artwork communicates my idea. I had to test the work, find problems,
and give specific feedback. A failed result was still useful because it helped
me explain what the project should not become.

## What I learned

Computational thinking helped me turn an invisible idea into small rules. The
most useful rule was not "make particles follow the mouse." It was "make one
area easier to read while other areas lose importance."

I learned the difference between copying a visual style and copying a
composition. The reference image helped with typography, rotation, size
contrast, and the black-and-white mood. Its circle shape did not fit my idea.

Testing was important. The code alone did not show me that the letters were too
small, the movement felt rough, the focus looked like a ring, or the main
character could be hidden. Each visual problem became a smaller coding problem
that I could change and test again.

The main interaction is made for a desktop mouse. If I continue the project, I
would test more screen sizes and add touch interaction without losing the slow
feeling.

## Code and how to run it

- `index.html` creates the page and Canvas.
- `style.css` creates the full-screen black-and-white layout.
- `script.js` creates the marks, reads the mouse, updates focus, and draws each
  frame.
- The project has no outside libraries.

The easiest way to view the finished project is to open the
[live website](https://yuuu1229.github.io/the-weight-of-attention/).

To run it on this computer, open Terminal and enter these two commands:

```sh
cd ~/Desktop/5003/the-weight-of-attention
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. The
`cd` command is important. It makes the server use the project folder instead
of showing a list of files from another folder.

On another computer, replace the path after `cd` with the location of the
downloaded project folder.

The main interaction is made for a desktop mouse. Touch and pen input are not
included. Fonts may look a little different on different computers. A reduced
motion setting stops the drifting and pulling motion but keeps the focus change.
