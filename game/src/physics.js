// Night Archive — circle-vs-tile collision.
// Guards and the player share this: move one axis at a time so a circle
// slides along a wall instead of sticking to it.

import { TILE } from './config.js';

export function tileIsSolid(ch) {
  return ch === '#' || ch === 'C' || ch === 'S';
}

export function tileCharAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.tiles[ty][tx];
}

function circleHitsSolid(level, x, y, radius) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius) / TILE);
  const top = Math.floor((y - radius) / TILE);
  const bottom = Math.floor((y + radius) / TILE);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (!tileIsSolid(tileCharAt(level, tx, ty))) continue;
      const nearestX = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

// Move a circle by (dx, dy), axis by axis. Returns true when it moved at all.
export function moveCircle(level, pos, radius, dx, dy) {
  let moved = false;
  if (dx !== 0 && !circleHitsSolid(level, pos.x + dx, pos.y, radius)) {
    pos.x += dx;
    moved = true;
  }
  if (dy !== 0 && !circleHitsSolid(level, pos.x, pos.y + dy, radius)) {
    pos.y += dy;
    moved = true;
  }
  return moved;
}

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}
