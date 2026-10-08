import { State } from '../core/gameState.js';
import { getStage01Communication } from '../stages/stage01/hints/stage01Hints.js';
import { stage01Config } from '../stages/stage01/stage01Config.js';
import { facilityHudConfig } from './facilityHudConfig.js';
import { facilityHudView } from './facilityHudView.js';
import { HelperSpeech } from './helperSpeech.js';
import { GEM_FLIGHT_DURATION } from '../stages/stage01/stage01CombatConfig.js';

export function createFacilityHud({ state, getStage, returnToWorld }) {
  const root = document.querySelector('#facility-hud');
  root.innerHTML = facilityHudView();
  const canvas = document.querySelector('canvas');
  const gemFlight = root.querySelector('#gem-flight');
  const gemSlots = ['blue', 'green', 'gold'].map((color) => ({
    color,
    node: root.querySelector(`#gem-${color}`),
  }));
  function updateGems(stage) {
    const gem = stage.blaster.gem;
    gemSlots.forEach(({ color, node }) => {
      const collected = stage.session.gems[color];
      node.classList.toggle('collected', collected);
      node.textContent = collected ? '◆' : '◇';
      node.setAttribute(
        'aria-label',
        `${color} Gem: ${collected ? 'verzameld' : 'niet verzameld'}`,
      );
    });
    gemFlight.hidden = state.current !== State.PLAYING || gem.state !== 'flying';
    if (gemFlight.hidden) return;
    const rect = canvas.getBoundingClientRect();
    const slot = gemSlots[0].node.getBoundingClientRect();
    const startX = rect.left + ((gem.x + gem.w / 2) * rect.width) / stage01Config.width;
    const startY = rect.top + ((gem.y + gem.h / 2) * rect.height) / stage01Config.height;
    const t = Math.min(1, gem.elapsed / GEM_FLIGHT_DURATION);
    const eased = t * t * (3 - 2 * t);
    gemFlight.style.left = `${startX + (slot.left + slot.width / 2 - startX) * eased}px`;
    gemFlight.style.top = `${startY + (slot.top + slot.height / 2 - startY) * eased - Math.sin(t * Math.PI) * 35}px`;
  }
  const fitHud = () => {
    root.style.width = canvas.getBoundingClientRect().width + 'px';
  };
  new ResizeObserver(fitHud).observe(canvas);
  const controls = root.querySelector('#game-controls');
  const helper = root.querySelector('#helper');
  const bubble = root.querySelector('#helper-bubble');
  const text = root.querySelector('#helper-text');
  const announcement = root.querySelector('#helper-announcement');
  const dialog = root.querySelector('#facility-map');
  dialog.style.setProperty('--map-max-width', facilityHudConfig.mapSize.maxWidth + 'px');
  dialog.style.setProperty('--map-max-height', facilityHudConfig.mapSize.maxHeight + 'px');
  const map = root.querySelector('#map');
  const speech = new HelperSpeech();
  let previousStage,
    previouslyUnlocked = false;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restore = () => returnToWorld();
  const speak = (message) => {
    speech.speak(message, reducedMotion());
    text.textContent = speech.visibleText;
    announcement.textContent = message;
    bubble.hidden = false;
  };
  function requestHint() {
    if (getStage().exitAnimation) return;
    getStage().requestHint();
    speak(getStage01Communication(getStage()));
    restore();
  }
  function openMap() {
    if (state.current !== State.PLAYING || getStage().exitAnimation) return;
    const icon = map.getBoundingClientRect();
    state.set(State.MAP);
    dialog.showModal();
    const sheet = dialog.querySelector('.map-document');
    const rect = dialog.getBoundingClientRect();
    sheet.style.setProperty(
      '--map-origin-x',
      icon.left + icon.width / 2 - rect.left - rect.width / 2 + 'px',
    );
    sheet.style.setProperty(
      '--map-origin-y',
      icon.top + icon.height / 2 - rect.top - rect.height / 2 + 'px',
    );
    sheet.classList.remove('unfolding');
    void sheet.offsetWidth;
    sheet.classList.add('unfolding');
    map.setAttribute('aria-expanded', 'true');
    root.querySelector('#close-map').focus({ preventScroll: true });
  }
  function closeMap() {
    if (state.current !== State.MAP) return;
    dialog.close();
    map.setAttribute('aria-expanded', 'false');
    state.set(State.PLAYING);
    restore();
  }
  // Shared world assets retain an offline fallback if an image cannot load.
  function useImage(image, url, fallback) {
    image.addEventListener('load', () => {
      image.hidden = false;
      fallback.hidden = true;
    });
    image.addEventListener('error', () => {
      image.hidden = true;
      fallback.hidden = false;
    });
    image.src = url;
  }
  useImage(
    root.querySelector('.hud-map-image'),
    facilityHudConfig.mapIcon,
    root.querySelector('.map-icon-fallback'),
  );
  useImage(
    root.querySelector('#map-image'),
    facilityHudConfig.mapImage,
    root.querySelector('#map-fallback'),
  );
  helper.addEventListener('click', requestHint);
  map.addEventListener('click', openMap);
  root.querySelector('#close-map').addEventListener('click', closeMap);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeMap();
  });
  root.querySelector('#close-speech').addEventListener('click', () => {
    speech.dismiss();
    bubble.hidden = true;
    restore();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeMap();
  });
  controls.addEventListener('focusin', () => controls.classList.add('navigating'));
  controls.addEventListener('focusout', () => controls.classList.remove('navigating'));
  root.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (state.current === State.MAP) closeMap();
      else {
        speech.dismiss();
        bubble.hidden = true;
        restore();
      }
    } else if (
      state.current === State.PLAYING &&
      controls.contains(event.target) &&
      event.code.startsWith('Arrow')
    ) {
      event.preventDefault();
      event.stopPropagation();
      navigate({ direction: event.code.replace('Arrow', '').toLowerCase() });
    }
  });
  function navigate({ direction, confirm, back }) {
    if (state.current === State.MAP) {
      if (back || confirm) closeMap();
      return;
    }
    if (back) {
      speech.dismiss();
      bubble.hidden = true;
      restore();
      return;
    }
    const nodes = [...controls.querySelectorAll('button')].filter((node) => !node.hidden);
    if (direction) {
      const index = Math.max(0, nodes.indexOf(document.activeElement));
      const step = direction === 'left' || direction === 'up' ? -1 : 1;
      nodes[(index + step + nodes.length) % nodes.length]?.focus({ preventScroll: true });
    }
    if (confirm && nodes.includes(document.activeElement)) document.activeElement.click();
  }
  return {
    requestHint,
    get speechVisible() {
      return speech.visible;
    },
    dismissSpeech() {
      speech.dismiss();
      bubble.hidden = true;
      restore();
    },
    speak,
    closeMap,
    navigate,
    get controlsFocused() {
      return controls.contains(document.activeElement);
    },
    focusControls() {
      helper.focus({ preventScroll: true });
    },
    reset() {
      gemFlight.hidden = true;
      speech.dismiss();
      bubble.hidden = true;
      previousStage = getStage();
      previouslyUnlocked = false;
    },
    sync(current) {
      if (current !== State.PLAYING) gemFlight.hidden = true;
      if (current !== State.MAP && dialog.open) {
        dialog.close();
        map.setAttribute('aria-expanded', 'false');
      }
      bubble.hidden = current !== State.PLAYING || !speech.visible;
      controls.inert = current !== State.PLAYING;
    },
    update(dt) {
      const stage = getStage();
      if (!stage) return;
      updateGems(stage);
      if (previousStage !== stage || (previouslyUnlocked && !stage.progress.hintUnlocked)) {
        speech.dismiss();
        previousStage = stage;
        previouslyUnlocked = false;
      }
      if (!previouslyUnlocked && stage.progress.hintUnlocked)
        speak(stage01Config.hints.unlockMessage);
      previouslyUnlocked = stage.progress.hintUnlocked;
      helper.classList.toggle('linked', stage.progress.hintUnlocked);
      if (state.current === State.PLAYING) speech.update(dt);
      bubble.hidden = state.current !== State.PLAYING || !speech.visible;
      text.textContent = speech.visibleText;
      helper.classList.toggle('mouth-open', speech.mouthOpen);
      bubble.classList.toggle('helper-typing', speech.speaking);
    },
  };
}
