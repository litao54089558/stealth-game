// Night Archive — bootstrap and the main loop.
// ?shot=start|mid|alert renders one frozen frame for the screenshots.
// ?selftest=1 runs the in-browser checks and reports them in the DOM.
// Otherwise the game runs live: title, playing, paused, level clear,
// caught, and win screens, with Enter/Space (or a click) to advance.

import { VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { StealthAudio } from './audio.js';
import { KeyboardInput } from './input.js';
import { createGame, nextLevel, retryLevel, startLevel, updateGame } from './state.js';
import { drawGame } from './render.js';
import { buildShotState } from './shots.js';
import { runSelfTest } from './selftest.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('game');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;
const ctx = canvas.getContext('2d');
const audio = new StealthAudio();
const input = new KeyboardInput();

const hudLevel = document.getElementById('hud-level');
const hudCards = document.getElementById('hud-cards');
const hudAlertFill = document.getElementById('hud-alert-fill');
const hudAlertLabel = document.getElementById('hud-alert-label');
const hudTime = document.getElementById('hud-time');
const hudAttempts = document.getElementById('hud-attempts');

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function updateHud(state) {
  hudLevel.textContent = `Level ${state.levelIndex + 1} — ${state.levelName}`;
  hudCards.textContent =
    state.keycardsTotal > 0
      ? `Keycards ${state.keycardsGot}/${state.keycardsTotal}`
      : 'No keycard — just reach the exit';
  hudAlertFill.style.width = `${Math.round(state.maxAlert)}%`;
  hudAlertFill.style.background =
    state.maxAlert >= 75 ? '#ff5040' : state.maxAlert >= 35 ? '#ffb020' : '#39d98a';
  hudAlertLabel.textContent =
    state.maxAlert >= 75 ? 'HUNTED' : state.maxAlert >= 35 ? 'SUSPICIOUS' : 'UNSEEN';
  hudTime.textContent = formatTime(state.time);
  hudAttempts.textContent = `Attempt ${state.attempts}`;
}

function advanceScreen(state) {
  audio.ensure();
  audio.resume();
  if (state.screen === 'title') {
    startLevel(state);
  } else if (state.screen === 'levelclear') {
    nextLevel(state);
  } else if (state.screen === 'caught') {
    retryLevel(state);
  } else if (state.screen === 'win') {
    const fresh = createGame(0, state.audio);
    Object.assign(state, fresh);
  }
}

let state;

if (params.get('selftest') === '1') {
  runSelfTest();
  state = createGame(0, audio);
  drawGame(ctx, state);
  updateHud(state);
} else if (params.get('shot')) {
  // Frozen frame: build the preset state and render it once, no loop.
  state = buildShotState(params.get('shot'), audio);
  drawGame(ctx, state);
  updateHud(state);
  document.title = `Night Archive — shot ${params.get('shot')}`;
} else {
  state = createGame(0, audio);
  window.__game = state; // for debugging in the console
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.screen === 'playing') updateGame(state, input, dt);
    drawGame(ctx, state);
    updateHud(state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') advanceScreen(state);
    if (e.code === 'Escape') {
      if (state.screen === 'playing') state.screen = 'paused';
      else if (state.screen === 'paused') state.screen = 'playing';
    }
  });
  canvas.addEventListener('click', () => advanceScreen(state));
}
