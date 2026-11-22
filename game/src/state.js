// Night Archive — the game state and its per-frame update.
// Screens: title → playing ⇄ paused → levelclear → (next level | win),
// playing → caught → playing (retry). Pure logic: no DOM here, so the
// self-test can drive it with a fake input in a headless browser.

import {
  ALERT_CHASE_AT,
  EXIT_RADIUS,
  KEYCARD_RADIUS,
  LEVEL_NAMES,
} from './config.js';
import { LEVEL_DEFS, buildLevel } from './levels.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuard, updateGuard } from './guards.js';

export function createGame(levelIndex, audio) {
  const def = LEVEL_DEFS[levelIndex];
  const level = buildLevel(def);
  const state = {
    levelIndex,
    levelName: LEVEL_NAMES[levelIndex],
    level,
    player: createPlayer(level.playerStart.x, level.playerStart.y),
    guards: level.guardSpawns.map((spawn) => createGuard(spawn, level, def.patrolSpeed)),
    screen: 'title', // title | playing | paused | levelclear | caught | win
    time: 0,
    attempts: 1,
    keycardsGot: 0,
    keycardsTotal: level.keycards.length,
    maxAlert: 0,
    message: '',
    messageTimer: 0,
    heartbeatTimer: 0,
    audio: audio || null,
    totalTime: 0,
  };
  return state;
}

export function startLevel(state) {
  const fresh = createGame(state.levelIndex, state.audio);
  fresh.totalTime = state.totalTime;
  fresh.screen = 'playing';
  Object.assign(state, fresh);
}

export function retryLevel(state) {
  state.attempts += 1;
  startLevel(state);
}

export function nextLevel(state) {
  if (state.levelIndex + 1 >= LEVEL_DEFS.length) {
    state.screen = 'win';
    return;
  }
  state.totalTime += state.time;
  const next = createGame(state.levelIndex + 1, state.audio);
  next.totalTime = state.totalTime;
  next.screen = 'playing';
  Object.assign(state, next);
}

export function nearestGuardDistance(state) {
  let best = Infinity;
  for (const guard of state.guards) {
    const d = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
    if (d < best) best = d;
  }
  return best;
}

export function updateGame(state, input, dt) {
  if (state.screen !== 'playing') return;
  state.time += dt;
  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) state.message = '';
  }

  const audio = state.audio;
  updatePlayer(
    state.player,
    input,
    state.level,
    dt,
    (dist) => audio && audio.playPlayerStep(dist),
    nearestGuardDistance(state),
  );

  let caughtBy = null;
  for (const guard of state.guards) {
    updateGuard(guard, state.player, state.level, dt, state.level.viewDistance, {
      onGuardStep: (g) => audio && audio.playGuardStep(g, state.player),
      onSpotted: () => audio && audio.playAlertSting(),
      onCaught: (g) => {
        if (!caughtBy) caughtBy = g;
      },
    });
  }
  state.maxAlert = state.guards.reduce((m, g) => Math.max(m, g.alert), 0);

  // A fast heartbeat while any guard is hunting.
  if (state.maxAlert >= ALERT_CHASE_AT && audio) {
    state.heartbeatTimer += dt;
    if (state.heartbeatTimer >= 0.9) {
      state.heartbeatTimer = 0;
      audio.playHeartbeat();
    }
  }

  // Keycards: walk over one to pick it up.
  for (const card of state.level.keycards) {
    if (card.taken) continue;
    const d = Math.hypot(card.x - state.player.x, card.y - state.player.y);
    if (d < KEYCARD_RADIUS) {
      card.taken = true;
      state.keycardsGot += 1;
      if (audio) audio.playPickup();
    }
  }

  // The exit: locked until every keycard is collected.
  const exitDist = Math.hypot(
    state.level.exit.x - state.player.x,
    state.level.exit.y - state.player.y,
  );
  if (exitDist < EXIT_RADIUS) {
    if (state.keycardsGot >= state.keycardsTotal) {
      state.screen = 'levelclear';
      if (audio) audio.playLevelClear();
      return;
    }
    state.message = `Locked — find ${state.keycardsTotal - state.keycardsGot} more keycard(s) first.`;
    state.messageTimer = 2;
  }

  if (caughtBy) {
    state.screen = 'caught';
    if (audio) audio.playCaught();
  }
}
