// Night Archive — the player.
// Moves with WASD or arrows; holding Shift sneaks (slower, quieter, and
// harder for guards to spot). Steps are timed so the audio module can
// play one footstep per stride.

import {
  PLAYER_RADIUS,
  PLAYER_SNEAK_SPEED,
  PLAYER_WALK_SPEED,
  STEP_INTERVAL_SNEAK,
  STEP_INTERVAL_WALK,
} from './config.js';
import { moveCircle } from './physics.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    radius: PLAYER_RADIUS,
    facing: -Math.PI / 2, // face up at the start
    moving: false,
    sneaking: false,
    stepTimer: 0,
  };
}

// input: { axis(): {x, y}, sneaking: boolean }
// onStep(nearestGuardDistance): called once per stride while moving.
export function updatePlayer(player, input, level, dt, onStep, nearestGuardDistance) {
  const axis = input.axis();
  player.sneaking = input.sneaking;
  const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  const len = Math.hypot(axis.x, axis.y);
  player.moving = len > 0;
  if (!player.moving) {
    player.stepTimer = 0;
    return;
  }
  const nx = axis.x / len;
  const ny = axis.y / len;
  const moved = moveCircle(level, player, player.radius, nx * speed * dt, ny * speed * dt);
  if (moved) {
    player.facing = Math.atan2(ny, nx);
    player.stepTimer += dt;
    const interval = player.sneaking ? STEP_INTERVAL_SNEAK : STEP_INTERVAL_WALK;
    if (player.stepTimer >= interval) {
      player.stepTimer = 0;
      if (onStep) onStep(nearestGuardDistance);
    }
  }
}
