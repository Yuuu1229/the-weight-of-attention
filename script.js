(() => {
  "use strict";

  const CONFIG = Object.freeze({
    colors: Object.freeze({
      background: "#08090B",
      mark: "#E8E8E3",
    }),
    population: Object.freeze({
      characters: 144,
      dots: 72,
      symbols: 24,
    }),
    vocabulary: Object.freeze({
      characters: Object.freeze(["a", "e", "n", "x", "0", "1", "7"]),
      symbols: Object.freeze(["+", "·", "–"]),
    }),
    sizing: Object.freeze({
      characterMin: 5,
      characterMax: 9,
      symbolMin: 5,
      symbolMax: 9,
      dotDiameterMin: 1,
      dotDiameterMax: 2,
    }),
    composition: Object.freeze({
      edgeMargin: 22,
      placementAttempts: 18,
      minimumSpacingMin: 10,
      minimumSpacingMax: 24,
    }),
    appearance: Object.freeze({
      opacityMin: 0.18,
      opacityMax: 0.48,
    }),
    movement: Object.freeze({
      amplitudeMin: 2.5,
      amplitudeMax: 8,
      frequencyMin: 0.018,
      frequencyMax: 0.055,
      secondaryAmplitudeRatio: 0.28,
      secondaryFrequencyRatio: 1.73,
      reducedMotionRatio: 0,
    }),
    rendering: Object.freeze({
      maximumPixelRatio: 2,
      maximumFrameDelta: 0.05,
      fontFamily:
        '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    }),
  });

  const canvas = document.querySelector("#field");
  const context = canvas?.getContext("2d", { alpha: false });

  if (!canvas || !context) {
    return;
  }

  const state = {
    width: 0,
    height: 0,
    pixelRatio: 1,
    elements: [],
    animationFrame: null,
    resizeFrame: null,
    elapsed: 0,
    previousTimestamp: null,
    isDocumentVisible: !document.hidden,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
  };

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function getMinimumSpacing() {
    const areaPerElement =
      (state.width * state.height) /
      (CONFIG.population.characters +
        CONFIG.population.dots +
        CONFIG.population.symbols);
    const proportionalSpacing = Math.sqrt(areaPerElement) * 0.3;

    return Math.min(
      CONFIG.composition.minimumSpacingMax,
      Math.max(CONFIG.composition.minimumSpacingMin, proportionalSpacing),
    );
  }

  function choosePosition(existingElements) {
    const marginX = Math.min(CONFIG.composition.edgeMargin, state.width * 0.08);
    const marginY = Math.min(CONFIG.composition.edgeMargin, state.height * 0.08);
    const availableWidth = Math.max(1, state.width - marginX * 2);
    const availableHeight = Math.max(1, state.height - marginY * 2);
    const minimumSpacing = getMinimumSpacing();
    let bestCandidate = null;
    let bestDistance = -1;

    // A small best-candidate pass prevents collisions without producing a grid.
    for (
      let attempt = 0;
      attempt < CONFIG.composition.placementAttempts;
      attempt += 1
    ) {
      const candidate = {
        x: marginX + Math.random() * availableWidth,
        y: marginY + Math.random() * availableHeight,
      };
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const element of existingElements) {
        const elementX = element.normalizedX * state.width;
        const elementY = element.normalizedY * state.height;
        nearestDistance = Math.min(
          nearestDistance,
          Math.hypot(candidate.x - elementX, candidate.y - elementY),
        );
      }

      if (nearestDistance >= minimumSpacing) {
        return candidate;
      }

      if (nearestDistance > bestDistance) {
        bestDistance = nearestDistance;
        bestCandidate = candidate;
      }
    }

    return bestCandidate ?? { x: state.width / 2, y: state.height / 2 };
  }

  function createElement(type, id, existingElements) {
    const position = choosePosition(existingElements);
    const isDot = type === "dot";
    const isSymbol = type === "symbol";
    const size = isDot
      ? randomBetween(
          CONFIG.sizing.dotDiameterMin,
          CONFIG.sizing.dotDiameterMax,
        )
      : randomBetween(
          isSymbol
            ? CONFIG.sizing.symbolMin
            : CONFIG.sizing.characterMin,
          isSymbol
            ? CONFIG.sizing.symbolMax
            : CONFIG.sizing.characterMax,
        );

    return {
      id,
      type,
      content: isDot
        ? null
        : randomItem(
            isSymbol
              ? CONFIG.vocabulary.symbols
              : CONFIG.vocabulary.characters,
          ),
      normalizedX: position.x / state.width,
      normalizedY: position.y / state.height,
      size,
      font: isDot
        ? null
        : `${size.toFixed(2)}px ${CONFIG.rendering.fontFamily}`,
      opacity: randomBetween(
        CONFIG.appearance.opacityMin,
        CONFIG.appearance.opacityMax,
      ),
      amplitudeX: randomBetween(
        CONFIG.movement.amplitudeMin,
        CONFIG.movement.amplitudeMax,
      ),
      amplitudeY: randomBetween(
        CONFIG.movement.amplitudeMin,
        CONFIG.movement.amplitudeMax,
      ),
      frequencyX: randomBetween(
        CONFIG.movement.frequencyMin,
        CONFIG.movement.frequencyMax,
      ),
      frequencyY: randomBetween(
        CONFIG.movement.frequencyMin,
        CONFIG.movement.frequencyMax,
      ),
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
    };
  }

  function initializeElements() {
    const types = shuffle([
      ...Array(CONFIG.population.characters).fill("character"),
      ...Array(CONFIG.population.dots).fill("dot"),
      ...Array(CONFIG.population.symbols).fill("symbol"),
    ]);

    state.elements = [];

    // Identity and content are assigned once and remain stable for the session.
    types.forEach((type, index) => {
      state.elements.push(createElement(type, index, state.elements));
    });
  }

  function getElementPosition(element, elapsed) {
    const motionRatio = state.prefersReducedMotion.matches
      ? CONFIG.movement.reducedMotionRatio
      : 1;
    // Two very slow oscillations avoid a mechanical circular drift.
    const primaryX = Math.sin(
      elapsed * element.frequencyX + element.phaseX,
    );
    const primaryY = Math.cos(
      elapsed * element.frequencyY + element.phaseY,
    );
    const secondaryX = Math.cos(
      elapsed *
        element.frequencyY *
        CONFIG.movement.secondaryFrequencyRatio +
        element.phaseY,
    );
    const secondaryY = Math.sin(
      elapsed *
        element.frequencyX *
        CONFIG.movement.secondaryFrequencyRatio +
        element.phaseX,
    );
    const offsetX =
      (primaryX +
        secondaryX * CONFIG.movement.secondaryAmplitudeRatio) *
      element.amplitudeX *
      motionRatio;
    const offsetY =
      (primaryY +
        secondaryY * CONFIG.movement.secondaryAmplitudeRatio) *
      element.amplitudeY *
      motionRatio;
    const boundary = Math.max(element.size, CONFIG.composition.edgeMargin * 0.5);

    return {
      x: Math.min(
        state.width - boundary,
        Math.max(boundary, element.normalizedX * state.width + offsetX),
      ),
      y: Math.min(
        state.height - boundary,
        Math.max(boundary, element.normalizedY * state.height + offsetY),
      ),
    };
  }

  function drawTextElement(element, x, y) {
    context.font = element.font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(element.content, x, y);
  }

  function drawDot(element, x, y) {
    context.beginPath();
    context.arc(x, y, element.size / 2, 0, Math.PI * 2);
    context.fill();
  }

  function render() {
    context.globalAlpha = 1;
    context.fillStyle = CONFIG.colors.background;
    context.fillRect(0, 0, state.width, state.height);
    context.fillStyle = CONFIG.colors.mark;

    for (const element of state.elements) {
      const position = getElementPosition(element, state.elapsed);
      context.globalAlpha = element.opacity;

      if (element.type === "dot") {
        drawDot(element, position.x, position.y);
      } else {
        drawTextElement(element, position.x, position.y);
      }
    }

    context.globalAlpha = 1;
  }

  function animate(timestamp) {
    if (!state.isDocumentVisible || state.prefersReducedMotion.matches) {
      state.animationFrame = null;
      state.previousTimestamp = null;
      render();
      return;
    }

    if (state.previousTimestamp === null) {
      state.previousTimestamp = timestamp;
    }

    const delta = Math.min(
      (timestamp - state.previousTimestamp) / 1000,
      CONFIG.rendering.maximumFrameDelta,
    );
    state.previousTimestamp = timestamp;
    state.elapsed += delta;
    render();
    state.animationFrame = window.requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (
      state.animationFrame !== null ||
      !state.isDocumentVisible ||
      state.prefersReducedMotion.matches
    ) {
      render();
      return;
    }

    state.previousTimestamp = null;
    state.animationFrame = window.requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (state.animationFrame !== null) {
      window.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }
    state.previousTimestamp = null;
  }

  function resizeCanvas() {
    state.resizeFrame = null;

    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      CONFIG.rendering.maximumPixelRatio,
    );

    // Normalized base positions preserve composition and identity across resizes.
    state.width = width;
    state.height = height;
    state.pixelRatio = pixelRatio;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    render();
  }

  function scheduleResize() {
    if (state.resizeFrame !== null) {
      return;
    }

    state.resizeFrame = window.requestAnimationFrame(resizeCanvas);
  }

  function handleVisibilityChange() {
    state.isDocumentVisible = !document.hidden;

    if (state.isDocumentVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }

  function handleMotionPreferenceChange() {
    stopAnimation();
    render();
    startAnimation();
  }

  function initialize() {
    resizeCanvas();
    initializeElements();
    render();

    window.addEventListener("resize", scheduleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    state.prefersReducedMotion.addEventListener(
      "change",
      handleMotionPreferenceChange,
    );

    startAnimation();
  }

  initialize();
})();
