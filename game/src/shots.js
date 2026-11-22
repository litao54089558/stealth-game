// Night Archive — frozen states for the screenshots (?shot=...).
// A shot preset builds a real game state, places the player and the
// guards at chosen tiles, and renders one frame of it — the same code
// path as live play, with no editing or compositing. The frame is
// deterministic: positions and alert values are set, not simulated,
// so the screenshot is the same on every run.

import { TILE } from './config.js';
import { createGame, startLevel } from './state.js';
import { tileCenter } from './physics.js';

function placeGuardAtTile(guard, tx, ty, facing, alert, guardState, lastSeen) {
  const c = tileCenter(tx, ty);
  guard.x = c.x;
  guard.y = c.y;
  guard.facing = facing;
  guard.alert = alert;
  if (guardState) guard.state = guardState;
  if (lastSeen) guard.lastSeen = lastSeen;
  guard.pauseTimer = 99;
  guard.lostSightTimer = 0;
}

// start: the title screen over level 1.
// mid: level 2 mid-play — player behind cover, a suspicious guard with a
//   yellow cone and a "?" marker, the keycard and the exit both visible.
// alert: level 3 at high alert — a guard chasing with a red cone and a
//   "!" marker, the player pressed against cover.
export function buildShotState(shot, audio) {
  if (shot === 'mid') {
    const state = createGame(1, audio);
    startLevel(state);
    state.time = 83;
    const playerAt = tileCenter(13, 9);
    state.player.x = playerAt.x;
    state.player.y = playerAt.y;
    state.player.facing = Math.PI / 2;
    state.player.sneaking = true;
    placeGuardAtTile(state.guards[0], 14, 2, 0, 0, 'patrol');
    placeGuardAtTile(
      state.guards[1], 26, 11, Math.PI / 2, 45, 'investigate',
      { x: playerAt.x, y: playerAt.y },
    );
    placeGuardAtTile(state.guards[2], 14, 14, -Math.PI / 2, 12, 'patrol');
    state.maxAlert = 45;
    return state;
  }
  if (shot === 'alert') {
    const state = createGame(2, audio);
    startLevel(state);
    state.time = 142;
    const playerAt = tileCenter(12, 10);
    state.player.x = playerAt.x;
    state.player.y = playerAt.y;
    state.player.facing = -Math.PI / 2;
    state.player.sneaking = true;
    placeGuardAtTile(
      state.guards[0], 12, 6, Math.PI / 2, 84, 'chase',
      { x: playerAt.x, y: playerAt.y },
    );
    placeGuardAtTile(state.guards[1], 27, 9, Math.PI, 30, 'investigate', {
      x: playerAt.x,
      y: playerAt.y,
    });
    placeGuardAtTile(state.guards[2], 11, 14, 0, 0, 'patrol');
    placeGuardAtTile(state.guards[3], 22, 13, -Math.PI / 2, 0, 'patrol');
    state.maxAlert = 84;
    return state;
  }
  // 'start' and anything else: the title screen.
  const state = createGame(0, audio);
  state.screen = 'title';
  return state;
}
