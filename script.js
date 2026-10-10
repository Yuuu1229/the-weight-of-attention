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
      characters: Object.freeze([
        "a", "b", "e", "g", "h", "m", "n", "r", "s", "x",
        "A", "D", "H", "K", "M", "R", "W", "0", "1", "2", "7", "9",
      ]),
      symbols: Object.freeze(["+", "·", "–", "/", "(", ")"]),
    }),
    sizing: Object.freeze({
      characterMin: 10,
      characterMax: 20,
      characterAccentMin: 28,
      characterAccentMax: 48,
      symbolMin: 9,
      symbolMax: 18,
      symbolAccentMin: 22,
      symbolAccentMax: 38,
      accentProbability: 0.2,
      numericScale: 1.15,
      dotDiameterMin: 2,
      dotDiameterMax: 4,
    }),
    composition: Object.freeze({
      edgeMargin: 28,
      placementAttempts: 24,
      minimumSpacingMin: 6,
      minimumSpacingMax: 16,
      coreProbability: 0.84,
      coreRadiusMin: 0.14,
      coreRadiusMax: 0.4,
      peripheralRadiusMin: 0.4,
      peripheralRadiusMax: 0.8,
      horizontalRadiusScale: 1.2,
    }),
    appearance: Object.freeze({
      opacityMin: 0.28,
      opacityMax: 0.72,
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
      fontFamilies: Object.freeze([
        'Didot, "Bodoni 72", "Times New Roman", serif',
        '"Iowan Old Style", Palatino, Georgia, serif',
        'Georgia, "Times New Roman", serif',
        '"Snell Roundhand", "Apple Chancery", cursive',
        '"SFMono-Regular", Consolas, Menlo, monospace',
      ]),
    }),
    attention: Object.freeze({
      focusBuildTime: 1.5,
      focusReleaseTime: 2,
      searchAwarenessMax: 0.15,
      stableSpeedThreshold: 12,
      fastSpeedThreshold: 80,
      dwellTolerance: 20,
      focusRadius: 260,
      maximumEffectiveFocusCount: 1,
      velocityResponseTime: 0.12,
      maximumAttentionFrameGap: 0.25,
      ownershipHysteresis: 0.05,
      handoffDuration: 0.35,
      focusPositionResponseTime: 0.1,
      strengthEpsilon: 0.0001,
      minimumSampleInterval: 0.001,
    }),
    response: Object.freeze({
      maximumAttractionRatio: 0.45,
      maximumConvergenceDisplacement: 28,
      focusedOpacity: 0.98,
      peripheralFadeAmount: 0.72,
      minimumPeripheralOpacity: 0.1,
      focusedMotionReduction: 0.9,
      clarityStrengthExponent: 0.55,
      calmStartStrength: 0.15,
      calmCompletionStrength: 0.7,
      convergenceStartStrength: 0.18,
      peripheralFadeStartStrength: 0.4,
      positionSmoothingTime: 0.09,
      opacitySmoothingTime: 0.12,
      positionSettleEpsilon: 0.02,
      opacitySettleEpsilon: 0.001,
      transformSmoothingTime: 0.12,
      transformSettleEpsilon: 0.001,
      maximumTangentialDisplacement: 18,
      maximumFocusedScaleIncrease: 0.48,
      minimumFocusOrbitRadius: 76,
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
    attention: createAttentionState(),
    visualsSettling: false,
  };

  function createCandidateState() {
    return {
      active: false,
      anchorX: 0,
      anchorY: 0,
      dwellElapsed: 0,
      hasBegunDwell: false,
      awarenessStrength: 0,
      strength: 0,
    };
  }

  function createReleaseState() {
    return {
      active: false,
      x: 0,
      y: 0,
      capturedStrength: 0,
      elapsed: 0,
      strength: 0,
    };
  }

  function createAttentionState() {
    return {
      mode: "Ambient",
      pointer: {
        hasEntered: false,
        isInside: false,
        x: 0,
        y: 0,
        lastSampleX: 0,
        lastSampleY: 0,
        lastSampleTime: null,
        pendingVelocityX: 0,
        pendingVelocityY: 0,
        hasPendingVelocity: false,
        velocityX: 0,
        velocityY: 0,
        speed: 0,
      },
      candidate: createCandidateState(),
      release: createReleaseState(),
      effective: {
        owner: "none",
        x: null,
        y: null,
        strength: 0,
        transition: null,
      },
    };
  }

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

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function approach(current, target, maximumChange) {
    if (current < target) {
      return Math.min(target, current + maximumChange);
    }
    return Math.max(target, current - maximumChange);
  }

  function smoothStep(progress) {
    const boundedProgress = clamp(progress, 0, 1);
    return boundedProgress * boundedProgress * (3 - 2 * boundedProgress);
  }

  function getStagedResponse(strength, startStrength, endStrength = 1) {
    if (strength <= startStrength) {
      return 0;
    }

    return smoothStep(
      (strength - startStrength) / (endStrength - startStrength),
    );
  }

  function startCandidate(attention, x, y) {
    attention.candidate = {
      ...createCandidateState(),
      active: true,
      anchorX: x,
      anchorY: y,
    };
  }

  function getCandidatePosition(attention) {
    const { candidate, pointer } = attention;
    return candidate.hasBegunDwell
      ? { x: candidate.anchorX, y: candidate.anchorY }
      : { x: pointer.x, y: pointer.y };
  }

  function getOwnerChannel(attention, owner) {
    if (owner === "candidate" && attention.candidate.active) {
      const position = getCandidatePosition(attention);
      return {
        active: attention.candidate.strength > CONFIG.attention.strengthEpsilon,
        x: position.x,
        y: position.y,
        strength: attention.candidate.strength,
      };
    }

    if (owner === "release" && attention.release.active) {
      return {
        active: attention.release.strength > CONFIG.attention.strengthEpsilon,
        x: attention.release.x,
        y: attention.release.y,
        strength: attention.release.strength,
      };
    }

    return { active: false, x: null, y: null, strength: 0 };
  }

  function captureCandidateRelease(attention) {
    const { candidate, effective, release } = attention;
    const isEstablished =
      candidate.active &&
      candidate.strength >
        CONFIG.attention.searchAwarenessMax + CONFIG.attention.strengthEpsilon;

    if (!isEstablished) {
      return;
    }

    const capturedRelease = {
      active: true,
      x: candidate.anchorX,
      y: candidate.anchorY,
      capturedStrength: clamp(candidate.strength, 0, 1),
      elapsed: 0,
      strength: clamp(candidate.strength, 0, 1),
    };

    // Never replace a release that still owns the public effective focus.
    if (!release.active || effective.owner === "candidate") {
      attention.release = capturedRelease;
    }
  }

  function clearPointerEvidence(attention) {
    const { pointer } = attention;
    pointer.isInside = false;
    pointer.lastSampleTime = null;
    pointer.hasPendingVelocity = false;
    pointer.velocityX = 0;
    pointer.velocityY = 0;
    pointer.speed = 0;
  }

  function abandonCandidate(attention, startReplacement) {
    captureCandidateRelease(attention);
    attention.candidate = createCandidateState();

    if (startReplacement && attention.pointer.isInside) {
      startCandidate(attention, attention.pointer.x, attention.pointer.y);
    }
  }

  function invalidateAttentionPointer(attention) {
    abandonCandidate(attention, false);
    clearPointerEvidence(attention);
    resolveEffectiveFocus(attention, 0);
  }

  function getArtworkPointerPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    const scaleX = bounds.width > 0 ? state.width / bounds.width : 1;
    const scaleY = bounds.height > 0 ? state.height / bounds.height : 1;

    return {
      x: clamp((event.clientX - bounds.left) * scaleX, 0, state.width),
      y: clamp((event.clientY - bounds.top) * scaleY, 0, state.height),
    };
  }

  function isPrimaryMousePointer(event) {
    return event.pointerType === "mouse" && event.isPrimary;
  }

  function enterPointerAt(attention, position, sampleTime) {
    const { pointer } = attention;
    pointer.hasEntered = true;
    pointer.isInside = true;
    pointer.x = position.x;
    pointer.y = position.y;
    pointer.lastSampleX = position.x;
    pointer.lastSampleY = position.y;
    pointer.lastSampleTime = sampleTime;
    pointer.hasPendingVelocity = false;
    pointer.velocityX = 0;
    pointer.velocityY = 0;
    pointer.speed = 0;
    startCandidate(attention, position.x, position.y);
    attention.mode = "Searching";
  }

  function handlePointerEnter(event) {
    if (!isPrimaryMousePointer(event)) {
      return;
    }

    enterPointerAt(
      state.attention,
      getArtworkPointerPosition(event),
      performance.now(),
    );
    startAnimation();
  }

  function handlePointerMove(event) {
    if (!isPrimaryMousePointer(event)) {
      return;
    }

    const attention = state.attention;
    const pointer = attention.pointer;
    const position = getArtworkPointerPosition(event);
    const sampleTime = performance.now();

    if (!pointer.isInside) {
      enterPointerAt(attention, position, sampleTime);
      startAnimation();
      return;
    }

    const sampleInterval = (sampleTime - pointer.lastSampleTime) / 1000;
    pointer.x = position.x;
    pointer.y = position.y;

    if (sampleInterval >= CONFIG.attention.minimumSampleInterval) {
      pointer.pendingVelocityX =
        (position.x - pointer.lastSampleX) / sampleInterval;
      pointer.pendingVelocityY =
        (position.y - pointer.lastSampleY) / sampleInterval;
      pointer.hasPendingVelocity = true;
    }

    pointer.lastSampleX = position.x;
    pointer.lastSampleY = position.y;
    pointer.lastSampleTime = sampleTime;
    startAnimation();
  }

  function handlePointerLeave(event) {
    if (!isPrimaryMousePointer(event)) {
      return;
    }

    invalidateAttentionPointer(state.attention);
    startAnimation();
  }

  function updatePointerVelocity(attention, delta) {
    const { pointer } = attention;

    if (!pointer.isInside || delta <= 0) {
      return;
    }

    const response = 1 - Math.exp(-delta / CONFIG.attention.velocityResponseTime);
    const targetVelocityX = pointer.hasPendingVelocity
      ? pointer.pendingVelocityX
      : 0;
    const targetVelocityY = pointer.hasPendingVelocity
      ? pointer.pendingVelocityY
      : 0;
    const targetSpeed = pointer.hasPendingVelocity
      ? Math.hypot(pointer.pendingVelocityX, pointer.pendingVelocityY)
      : 0;

    pointer.velocityX += (targetVelocityX - pointer.velocityX) * response;
    pointer.velocityY += (targetVelocityY - pointer.velocityY) * response;
    // Smooth magnitude separately so fast direction changes cannot cancel out.
    const smoothedSpeed = pointer.speed + (targetSpeed - pointer.speed) * response;
    pointer.speed = pointer.hasPendingVelocity
      ? Math.max(targetSpeed, smoothedSpeed)
      : smoothedSpeed;
    pointer.hasPendingVelocity = false;
  }

  function getSearchingAwarenessTarget(speed) {
    const stableSpeed = CONFIG.attention.stableSpeedThreshold;
    const fastSpeed = CONFIG.attention.fastSpeedThreshold;

    if (speed <= stableSpeed) {
      return CONFIG.attention.searchAwarenessMax;
    }
    if (speed >= fastSpeed) {
      return 0;
    }

    const speedProgress = (speed - stableSpeed) / (fastSpeed - stableSpeed);
    return CONFIG.attention.searchAwarenessMax * (1 - speedProgress);
  }

  function updateCandidate(attention, delta) {
    const { pointer } = attention;

    if (!pointer.isInside) {
      return;
    }

    if (!attention.candidate.active) {
      startCandidate(attention, pointer.x, pointer.y);
    }

    const candidate = attention.candidate;
    const anchorDistance = Math.hypot(
      pointer.x - candidate.anchorX,
      pointer.y - candidate.anchorY,
    );

    if (anchorDistance > CONFIG.attention.dwellTolerance) {
      abandonCandidate(attention, true);
      return;
    }

    const isStable = pointer.speed <= CONFIG.attention.stableSpeedThreshold;

    if (isStable && delta > 0) {
      candidate.hasBegunDwell = true;
      candidate.dwellElapsed = Math.min(
        CONFIG.attention.focusBuildTime,
        candidate.dwellElapsed + delta,
      );
      candidate.strength = Math.max(
        candidate.strength,
        candidate.dwellElapsed / CONFIG.attention.focusBuildTime,
      );
    } else if (!candidate.hasBegunDwell) {
      const awarenessTarget = getSearchingAwarenessTarget(pointer.speed);
      const responseTime =
        awarenessTarget > candidate.awarenessStrength
          ? CONFIG.attention.focusBuildTime
          : CONFIG.attention.focusReleaseTime;
      candidate.awarenessStrength = approach(
        candidate.awarenessStrength,
        awarenessTarget,
        delta / responseTime,
      );
      candidate.strength = candidate.awarenessStrength;
    }

    candidate.awarenessStrength = clamp(
      candidate.awarenessStrength,
      0,
      CONFIG.attention.searchAwarenessMax,
    );
    candidate.strength = clamp(candidate.strength, 0, 1);
  }

  function updateRelease(attention, delta) {
    const release = attention.release;

    if (!release.active) {
      return;
    }

    release.elapsed = Math.min(
      CONFIG.attention.focusReleaseTime,
      release.elapsed + delta,
    );
    release.strength = clamp(
      release.capturedStrength *
        (1 - release.elapsed / CONFIG.attention.focusReleaseTime),
      0,
      1,
    );

    if (release.strength <= CONFIG.attention.strengthEpsilon) {
      attention.release = createReleaseState();
    }
  }

  function chooseEffectiveOwner(attention) {
    const { effective } = attention;
    const candidate = getOwnerChannel(attention, "candidate");
    const release = getOwnerChannel(attention, "release");
    const current = getOwnerChannel(attention, effective.owner);

    if (effective.transition && current.active) {
      return effective.owner;
    }

    if (effective.owner === "candidate" && candidate.active) {
      return release.active &&
        release.strength >
          candidate.strength + CONFIG.attention.ownershipHysteresis
        ? "release"
        : "candidate";
    }

    if (effective.owner === "release" && release.active) {
      return candidate.active &&
        candidate.strength >
          release.strength + CONFIG.attention.ownershipHysteresis
        ? "candidate"
        : "release";
    }

    if (candidate.active && release.active) {
      return candidate.strength > release.strength ? "candidate" : "release";
    }
    if (candidate.active) {
      return "candidate";
    }
    if (release.active) {
      return "release";
    }
    return "none";
  }

  function beginEffectiveTransition(attention, owner) {
    const { effective } = attention;
    const target = getOwnerChannel(attention, owner);

    if (owner === "none" || !target.active) {
      effective.owner = "none";
      effective.strength = 0;
      effective.transition = null;
      return;
    }

    if (effective.x === null || effective.y === null) {
      effective.x = target.x;
      effective.y = target.y;
    }

    effective.transition = {
      elapsed: 0,
      fromX: effective.x,
      fromY: effective.y,
      fromStrength: effective.strength,
    };
    effective.owner = owner;
  }

  function updateEffectiveOutput(attention, delta) {
    const { effective } = attention;
    const target = getOwnerChannel(attention, effective.owner);

    if (!target.active) {
      effective.owner = "none";
      effective.strength = 0;
      effective.transition = null;
      return;
    }

    if (!effective.transition) {
      const positionResponse =
        delta > 0
          ? 1 - Math.exp(-delta / CONFIG.attention.focusPositionResponseTime)
          : 1;
      effective.x += (target.x - effective.x) * positionResponse;
      effective.y += (target.y - effective.y) * positionResponse;
      effective.strength = clamp(target.strength, 0, 1);
      return;
    }

    effective.transition.elapsed = Math.min(
      CONFIG.attention.handoffDuration,
      effective.transition.elapsed + delta,
    );
    const progress = smoothStep(
      effective.transition.elapsed / CONFIG.attention.handoffDuration,
    );
    effective.x =
      effective.transition.fromX +
      (target.x - effective.transition.fromX) * progress;
    effective.y =
      effective.transition.fromY +
      (target.y - effective.transition.fromY) * progress;
    effective.strength = clamp(
      effective.transition.fromStrength +
        (target.strength - effective.transition.fromStrength) * progress,
      0,
      1,
    );

    if (effective.transition.elapsed >= CONFIG.attention.handoffDuration) {
      effective.transition = null;
    }
  }

  function deriveAttentionMode(attention) {
    if (attention.effective.owner === "release") {
      return "Release";
    }
    if (attention.effective.owner === "candidate") {
      return attention.candidate.hasBegunDwell ? "Focusing" : "Searching";
    }
    return attention.pointer.isInside ? "Searching" : "Ambient";
  }

  function resolveEffectiveFocus(attention, delta) {
    const selectedOwner = chooseEffectiveOwner(attention);

    if (selectedOwner !== attention.effective.owner) {
      beginEffectiveTransition(attention, selectedOwner);
    }

    updateEffectiveOutput(attention, delta);
    attention.mode = deriveAttentionMode(attention);
  }

  function updateAttention(attention, delta) {
    updatePointerVelocity(attention, delta);
    updateCandidate(attention, delta);
    updateRelease(attention, delta);
    resolveEffectiveFocus(attention, delta);
  }

  function resetAttentionAfterFrameGap(attention) {
    const { pointer } = attention;
    pointer.lastSampleTime = pointer.isInside ? performance.now() : null;
    pointer.lastSampleX = pointer.x;
    pointer.lastSampleY = pointer.y;
    pointer.hasPendingVelocity = false;
    pointer.velocityX = 0;
    pointer.velocityY = 0;
    pointer.speed = 0;
  }

  function attentionNeedsAnimation(attention) {
    return (
      attention.release.active ||
      attention.effective.transition !== null ||
      (attention.pointer.isInside &&
        (!attention.candidate.active ||
          attention.candidate.strength < 1 ||
          attention.pointer.hasPendingVelocity ||
          attention.pointer.speed > CONFIG.attention.strengthEpsilon))
    );
  }

  function getMinimumSpacing() {
    const areaPerElement =
      (state.width * state.height) /
      (CONFIG.population.characters +
        CONFIG.population.dots +
        CONFIG.population.symbols);
    const proportionalSpacing = Math.sqrt(areaPerElement) * 0.22;

    return Math.min(
      CONFIG.composition.minimumSpacingMax,
      Math.max(CONFIG.composition.minimumSpacingMin, proportionalSpacing),
    );
  }

  function createCompositionCandidate(marginX, marginY) {
    const centerX = state.width * 0.5;
    const centerY = state.height * 0.52;
    const referenceSize = Math.min(state.width, state.height);
    const isCore = Math.random() < CONFIG.composition.coreProbability;
    const radius =
      referenceSize *
      randomBetween(
        isCore
          ? CONFIG.composition.coreRadiusMin
          : CONFIG.composition.peripheralRadiusMin,
        isCore
          ? CONFIG.composition.coreRadiusMax
          : CONFIG.composition.peripheralRadiusMax,
      );
    const angle = Math.random() * Math.PI * 2;

    return {
      x: clamp(
        centerX +
          Math.cos(angle) *
            radius *
            CONFIG.composition.horizontalRadiusScale,
        marginX,
        state.width - marginX,
      ),
      y: clamp(
        centerY + Math.sin(angle) * radius,
        marginY,
        state.height - marginY,
      ),
    };
  }

  function choosePosition(existingElements) {
    const marginX = Math.min(CONFIG.composition.edgeMargin, state.width * 0.08);
    const marginY = Math.min(CONFIG.composition.edgeMargin, state.height * 0.08);
    const minimumSpacing = getMinimumSpacing();
    let bestCandidate = null;
    let bestDistance = -1;

    // A small best-candidate pass prevents collisions without producing a grid.
    for (
      let attempt = 0;
      attempt < CONFIG.composition.placementAttempts;
      attempt += 1
    ) {
      const candidate = createCompositionCandidate(marginX, marginY);
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
    const content = isDot
      ? null
      : randomItem(
          isSymbol
            ? CONFIG.vocabulary.symbols
            : CONFIG.vocabulary.characters,
        );
    const isAccent = !isDot && Math.random() < CONFIG.sizing.accentProbability;
    let size;

    if (isDot) {
      size = randomBetween(
        CONFIG.sizing.dotDiameterMin,
        CONFIG.sizing.dotDiameterMax,
      );
    } else if (isSymbol) {
      size = randomBetween(
        isAccent ? CONFIG.sizing.symbolAccentMin : CONFIG.sizing.symbolMin,
        isAccent ? CONFIG.sizing.symbolAccentMax : CONFIG.sizing.symbolMax,
      );
    } else {
      size = randomBetween(
        isAccent
          ? CONFIG.sizing.characterAccentMin
          : CONFIG.sizing.characterMin,
        isAccent
          ? CONFIG.sizing.characterAccentMax
          : CONFIG.sizing.characterMax,
      );

      if (/^\d$/.test(content)) {
        size *= CONFIG.sizing.numericScale;
      }
    }

    const fontFamily = isDot
      ? null
      : randomItem(CONFIG.rendering.fontFamilies);
    const fontStyle = !isDot && Math.random() < 0.3 ? "italic" : "normal";
    const fontWeight = !isDot && isAccent ? 500 : 400;

    return {
      id,
      type,
      content,
      normalizedX: position.x / state.width,
      normalizedY: position.y / state.height,
      size,
      font: isDot
        ? null
        : `${fontStyle} ${fontWeight} ${size.toFixed(2)}px ${fontFamily}`,
      opacity: randomBetween(
        CONFIG.appearance.opacityMin,
        CONFIG.appearance.opacityMax,
      ),
      renderX: null,
      renderY: null,
      renderOpacity: null,
      renderScale: null,
      renderRotation: null,
      rotation: randomBetween(-0.58, 0.58),
      focusRotation: randomBetween(-0.42, 0.42),
      focusScale: randomBetween(0.45, 1),
      orbitBias: randomBetween(-1, 1),
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

  function getElementVisualState(element, elapsed) {
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
    const rawOffsetX =
      (primaryX +
        secondaryX * CONFIG.movement.secondaryAmplitudeRatio) *
      element.amplitudeX *
      motionRatio;
    const rawOffsetY =
      (primaryY +
        secondaryY * CONFIG.movement.secondaryAmplitudeRatio) *
      element.amplitudeY *
      motionRatio;
    const boundary = Math.max(element.size, CONFIG.composition.edgeMargin * 0.5);
    const baseX = element.normalizedX * state.width;
    const baseY = element.normalizedY * state.height;
    const uncalmedX = clamp(
      baseX + rawOffsetX,
      boundary,
      state.width - boundary,
    );
    const uncalmedY = clamp(
      baseY + rawOffsetY,
      boundary,
      state.height - boundary,
    );
    const ambientRotation =
      element.rotation +
      Math.sin(elapsed * element.frequencyX * 0.7 + element.phaseY) *
        0.035 *
        motionRatio;
    const effective = state.attention.effective;
    const hasFocus =
      effective.owner !== "none" &&
      effective.x !== null &&
      effective.y !== null &&
      effective.strength > CONFIG.attention.strengthEpsilon;

    if (!hasFocus) {
      return {
        x: uncalmedX,
        y: uncalmedY,
        opacity: element.opacity,
        scale: 1,
        rotation: ambientRotation,
      };
    }

    const focusStrength = clamp(effective.strength, 0, 1);
    const clarityStrength = Math.pow(
      focusStrength,
      CONFIG.response.clarityStrengthExponent,
    );
    const calmStrength = getStagedResponse(
      focusStrength,
      CONFIG.response.calmStartStrength,
      CONFIG.response.calmCompletionStrength,
    );
    const convergenceStrength = getStagedResponse(
      focusStrength,
      CONFIG.response.convergenceStartStrength,
    );
    const peripheralStrength = getStagedResponse(
      focusStrength,
      CONFIG.response.peripheralFadeStartStrength,
    );
    const initialDistance = Math.hypot(
      effective.x - uncalmedX,
      effective.y - uncalmedY,
    );
    const radiusProgress = clamp(
      initialDistance / CONFIG.attention.focusRadius,
      0,
      1,
    );
    const localInfluence = 1 - smoothStep(radiusProgress);
    const calmAmount =
      CONFIG.response.focusedMotionReduction * localInfluence * calmStrength;
    const ambientX = clamp(
      baseX + rawOffsetX * (1 - calmAmount),
      boundary,
      state.width - boundary,
    );
    const ambientY = clamp(
      baseY + rawOffsetY * (1 - calmAmount),
      boundary,
      state.height - boundary,
    );
    const focusDeltaX = effective.x - ambientX;
    const focusDeltaY = effective.y - ambientY;
    const focusDistance = Math.hypot(focusDeltaX, focusDeltaY);
    const requestedRatio =
      CONFIG.response.maximumAttractionRatio *
      localInfluence *
      convergenceStrength;
    const displacementLimit =
      CONFIG.response.maximumConvergenceDisplacement * convergenceStrength;
    const displacementRatio =
      focusDistance > 0
        ? Math.min(requestedRatio, displacementLimit / focusDistance)
        : 0;
    const spatialRatio = state.prefersReducedMotion.matches
      ? 0
      : displacementRatio;
    const tangentX = focusDistance > 0 ? -focusDeltaY / focusDistance : 0;
    const tangentY = focusDistance > 0 ? focusDeltaX / focusDistance : 0;
    const tangentialDisplacement = state.prefersReducedMotion.matches
      ? 0
      : CONFIG.response.maximumTangentialDisplacement *
        localInfluence *
        convergenceStrength *
        element.orbitBias;
    const clarifiedOpacity =
      element.opacity +
      (CONFIG.response.focusedOpacity - element.opacity) *
        localInfluence *
        clarityStrength;
    const peripheralFactor =
      1 -
      CONFIG.response.peripheralFadeAmount *
        peripheralStrength *
        (1 - localInfluence);
    let visualX =
      ambientX +
      focusDeltaX * spatialRatio +
      tangentX * tangentialDisplacement;
    let visualY =
      ambientY +
      focusDeltaY * spatialRatio +
      tangentY * tangentialDisplacement;

    if (!state.prefersReducedMotion.matches) {
      const orbitRadius =
        CONFIG.response.minimumFocusOrbitRadius * convergenceStrength;
      const orbitDeltaX = visualX - effective.x;
      const orbitDeltaY = visualY - effective.y;
      const orbitDistance = Math.hypot(orbitDeltaX, orbitDeltaY);

      if (orbitDistance < orbitRadius) {
        const orbitAngle =
          orbitDistance > 0
            ? Math.atan2(orbitDeltaY, orbitDeltaX)
            : element.phaseX;
        visualX = effective.x + Math.cos(orbitAngle) * orbitRadius;
        visualY = effective.y + Math.sin(orbitAngle) * orbitRadius;
      }
    }

    return {
      x: clamp(visualX, boundary, state.width - boundary),
      y: clamp(visualY, boundary, state.height - boundary),
      opacity: clamp(
        clarifiedOpacity * peripheralFactor,
        CONFIG.response.minimumPeripheralOpacity,
        CONFIG.response.focusedOpacity,
      ),
      scale: state.prefersReducedMotion.matches
        ? 1
        : 1 +
          CONFIG.response.maximumFocusedScaleIncrease *
            element.focusScale *
            localInfluence *
            clarityStrength,
      rotation: state.prefersReducedMotion.matches
        ? element.rotation
        : ambientRotation +
          element.focusRotation * localInfluence * convergenceStrength,
    };
  }

  function drawTextElement(element, x, y, scale, rotation) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(scale, scale);
    context.font = element.font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(element.content, 0, 0);
    context.restore();
  }

  function drawDot(element, x, y, scale) {
    context.beginPath();
    context.arc(x, y, (element.size * scale) / 2, 0, Math.PI * 2);
    context.fill();
  }

  function render(delta = 0) {
    context.globalAlpha = 1;
    context.fillStyle = CONFIG.colors.background;
    context.fillRect(0, 0, state.width, state.height);
    context.fillStyle = CONFIG.colors.mark;
    state.visualsSettling = false;

    const positionResponse =
      delta > 0
        ? 1 - Math.exp(-delta / CONFIG.response.positionSmoothingTime)
        : 1;
    const opacityResponse =
      delta > 0
        ? 1 - Math.exp(-delta / CONFIG.response.opacitySmoothingTime)
        : 1;
    const transformResponse =
      delta > 0
        ? 1 - Math.exp(-delta / CONFIG.response.transformSmoothingTime)
        : 1;

    for (const element of state.elements) {
      const target = getElementVisualState(element, state.elapsed);

      if (
        element.renderX === null ||
        element.renderY === null ||
        element.renderOpacity === null ||
        element.renderScale === null ||
        element.renderRotation === null
      ) {
        element.renderX = target.x;
        element.renderY = target.y;
        element.renderOpacity = target.opacity;
        element.renderScale = target.scale;
        element.renderRotation = target.rotation;
      } else {
        element.renderX += (target.x - element.renderX) * positionResponse;
        element.renderY += (target.y - element.renderY) * positionResponse;
        element.renderOpacity +=
          (target.opacity - element.renderOpacity) * opacityResponse;
        element.renderScale +=
          (target.scale - element.renderScale) * transformResponse;
        const rotationDelta = Math.atan2(
          Math.sin(target.rotation - element.renderRotation),
          Math.cos(target.rotation - element.renderRotation),
        );
        element.renderRotation += rotationDelta * transformResponse;
      }

      if (
        Math.abs(target.x - element.renderX) >
          CONFIG.response.positionSettleEpsilon ||
        Math.abs(target.y - element.renderY) >
          CONFIG.response.positionSettleEpsilon ||
        Math.abs(target.opacity - element.renderOpacity) >
          CONFIG.response.opacitySettleEpsilon ||
        Math.abs(target.scale - element.renderScale) >
          CONFIG.response.transformSettleEpsilon ||
        Math.abs(target.rotation - element.renderRotation) >
          CONFIG.response.transformSettleEpsilon
      ) {
        state.visualsSettling = true;
      }

      context.globalAlpha = element.renderOpacity;

      if (element.type === "dot") {
        drawDot(element, element.renderX, element.renderY, element.renderScale);
      } else {
        drawTextElement(
          element,
          element.renderX,
          element.renderY,
          element.renderScale,
          element.renderRotation,
        );
      }
    }

    context.globalAlpha = 1;
  }

  function animate(timestamp) {
    if (!state.isDocumentVisible) {
      state.animationFrame = null;
      state.previousTimestamp = null;
      return;
    }

    if (state.previousTimestamp === null) {
      state.previousTimestamp = timestamp;
    }

    const rawDelta = Math.max(0, (timestamp - state.previousTimestamp) / 1000);
    const visualDelta = Math.min(
      rawDelta,
      CONFIG.rendering.maximumFrameDelta,
    );
    const attentionDelta =
      rawDelta <= CONFIG.attention.maximumAttentionFrameGap ? rawDelta : 0;
    state.previousTimestamp = timestamp;

    if (attentionDelta === 0 && rawDelta > 0) {
      resetAttentionAfterFrameGap(state.attention);
    }

    updateAttention(state.attention, attentionDelta);

    if (!state.prefersReducedMotion.matches) {
      state.elapsed += visualDelta;
    }
    render(visualDelta);

    if (
      !state.prefersReducedMotion.matches ||
      attentionNeedsAnimation(state.attention) ||
      state.visualsSettling
    ) {
      state.animationFrame = window.requestAnimationFrame(animate);
    } else {
      state.animationFrame = null;
      state.previousTimestamp = null;
    }
  }

  function startAnimation() {
    if (
      state.animationFrame !== null ||
      !state.isDocumentVisible
    ) {
      return;
    }

    if (
      state.prefersReducedMotion.matches &&
      !attentionNeedsAnimation(state.attention) &&
      !state.visualsSettling
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

  function resizeAttention(oldWidth, oldHeight, newWidth, newHeight) {
    if (oldWidth <= 0 || oldHeight <= 0) {
      return;
    }

    const attention = state.attention;
    captureCandidateRelease(attention);
    attention.candidate = createCandidateState();
    clearPointerEvidence(attention);

    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;

    if (attention.release.active) {
      attention.release.x *= scaleX;
      attention.release.y *= scaleY;
    }

    if (attention.effective.x !== null && attention.effective.y !== null) {
      attention.effective.x *= scaleX;
      attention.effective.y *= scaleY;
    }

    if (attention.effective.transition) {
      attention.effective.transition.fromX *= scaleX;
      attention.effective.transition.fromY *= scaleY;
    }

    resolveEffectiveFocus(attention, 0);
  }

  function resizeCanvas() {
    state.resizeFrame = null;

    const oldWidth = state.width;
    const oldHeight = state.height;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      CONFIG.rendering.maximumPixelRatio,
    );

    if (width !== oldWidth || height !== oldHeight) {
      resizeAttention(oldWidth, oldHeight, width, height);
    }

    // Normalized base positions preserve composition and identity across resizes.
    state.width = width;
    state.height = height;
    state.pixelRatio = pixelRatio;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    for (const element of state.elements) {
      element.renderX = null;
      element.renderY = null;
      element.renderOpacity = null;
      element.renderScale = null;
      element.renderRotation = null;
    }

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
      invalidateAttentionPointer(state.attention);
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
    canvas.addEventListener("pointerenter", handlePointerEnter, {
      passive: true,
    });
    canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
    canvas.addEventListener("pointerleave", handlePointerLeave, {
      passive: true,
    });
    state.prefersReducedMotion.addEventListener(
      "change",
      handleMotionPreferenceChange,
    );

    startAnimation();
  }

  initialize();
})();
