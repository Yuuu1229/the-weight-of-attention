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
      characterMin: 7,
      characterMax: 11,
      symbolMin: 6.5,
      symbolMax: 10.5,
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
    attention: Object.freeze({
      focusBuildTime: 1.5,
      focusReleaseTime: 2,
      searchAwarenessMax: 0.15,
      stableSpeedThreshold: 12,
      fastSpeedThreshold: 80,
      dwellTolerance: 20,
      focusRadius: 200,
      maximumEffectiveFocusCount: 1,
      velocityResponseTime: 0.12,
      maximumAttentionFrameGap: 0.25,
      ownershipHysteresis: 0.05,
      handoffDuration: 0.25,
      strengthEpsilon: 0.0001,
      minimumSampleInterval: 0.001,
    }),
    response: Object.freeze({
      maximumAttractionRatio: 0.45,
      maximumConvergenceDisplacement: 28,
      focusedOpacity: 0.94,
      peripheralFadeAmount: 0.72,
      minimumPeripheralOpacity: 0.1,
      focusedMotionReduction: 0.9,
      visualStrengthExponent: 0.78,
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
      effective.x = target.x;
      effective.y = target.y;
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
    const effective = state.attention.effective;
    const hasFocus =
      effective.owner !== "none" &&
      effective.x !== null &&
      effective.y !== null &&
      effective.strength > CONFIG.attention.strengthEpsilon;

    if (!hasFocus) {
      return { x: uncalmedX, y: uncalmedY, opacity: element.opacity };
    }

    const focusStrength = Math.pow(
      clamp(effective.strength, 0, 1),
      CONFIG.response.visualStrengthExponent,
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
      CONFIG.response.focusedMotionReduction * localInfluence * focusStrength;
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
      focusStrength;
    const displacementLimit =
      CONFIG.response.maximumConvergenceDisplacement * focusStrength;
    const displacementRatio =
      focusDistance > 0
        ? Math.min(requestedRatio, displacementLimit / focusDistance)
        : 0;
    const spatialRatio = state.prefersReducedMotion.matches
      ? 0
      : displacementRatio;
    const clarifiedOpacity =
      element.opacity +
      (CONFIG.response.focusedOpacity - element.opacity) *
        localInfluence *
        focusStrength;
    const peripheralFactor =
      1 -
      CONFIG.response.peripheralFadeAmount *
        focusStrength *
        (1 - localInfluence);

    return {
      x: clamp(
        ambientX + focusDeltaX * spatialRatio,
        boundary,
        state.width - boundary,
      ),
      y: clamp(
        ambientY + focusDeltaY * spatialRatio,
        boundary,
        state.height - boundary,
      ),
      opacity: clamp(
        clarifiedOpacity * peripheralFactor,
        CONFIG.response.minimumPeripheralOpacity,
        CONFIG.response.focusedOpacity,
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
      const visual = getElementVisualState(element, state.elapsed);
      context.globalAlpha = visual.opacity;

      if (element.type === "dot") {
        drawDot(element, visual.x, visual.y);
      } else {
        drawTextElement(element, visual.x, visual.y);
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
    render();

    if (
      !state.prefersReducedMotion.matches ||
      attentionNeedsAnimation(state.attention)
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
      !attentionNeedsAnimation(state.attention)
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
