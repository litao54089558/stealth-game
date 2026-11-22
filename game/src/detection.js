// Night Archive — what a guard can see.
// A guard sees the player only when all three hold: inside view distance,
// inside the vision cone's angle, and with a clear line of sight (walls,
// crates and shelves all block sight, so cover really hides you).

import {
  ALERT_RISE_FAR,
  ALERT_RISE_NEAR,
  ALERT_SNEAK_FACTOR,
  GUARD_HALF_VIEW_ANGLE,
  GUARD_SNEAK_VIEW_FACTOR,
  TILE,
} from './config.js';
import { tileCharAt } from './physics.js';

export function blocksSight(ch) {
  return ch === '#' || ch === 'C' || ch === 'S';
}

// Sample the segment every 6 px; blocked when a sample lands in a tile
// that blocks sight. The endpoints themselves never block.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (blocksSight(tileCharAt(level, tx, ty))) return false;
  }
  return true;
}

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// How far a guard's eye ray travels before hitting something that blocks
// sight. Used to clip the drawn vision cone to the walls.
export function raycastSightDistance(level, x, y, angle, maxDist) {
  const step = 8;
  for (let d = step; d <= maxDist; d += step) {
    const tx = Math.floor((x + Math.cos(angle) * d) / TILE);
    const ty = Math.floor((y + Math.sin(angle) * d) / TILE);
    if (blocksSight(tileCharAt(level, tx, ty))) return d - step;
  }
  return maxDist;
}

// Returns { sees, distance, closeness } — closeness is 1 up close, 0 at
// the edge of vision, and drives how fast the alert rises.
// Sneaking shrinks a guard's effective view: a sneaking player has to get
// much closer before the guard can spot them at all (and closeness is
// measured against that shrunken view, so the edge of it barely raises
// the alert).
export function guardSeesPlayer(guard, player, level, viewDistance) {
  const effectiveView = player.sneaking
    ? viewDistance * GUARD_SNEAK_VIEW_FACTOR
    : viewDistance;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > effectiveView) return { sees: false, distance, closeness: 0 };
  const angleToPlayer = Math.atan2(dy, dx);
  const offAngle = Math.abs(angleDifference(angleToPlayer, guard.facing));
  if (offAngle > GUARD_HALF_VIEW_ANGLE) return { sees: false, distance, closeness: 0 };
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) {
    return { sees: false, distance, closeness: 0 };
  }
  return { sees: true, distance, closeness: 1 - distance / effectiveView };
}

// Alert points per second while the guard has eyes on the player.
export function alertRisePerSecond(closeness, sneaking) {
  const rate = ALERT_RISE_FAR + (ALERT_RISE_NEAR - ALERT_RISE_FAR) * closeness;
  return sneaking ? rate * ALERT_SNEAK_FACTOR : rate;
}
