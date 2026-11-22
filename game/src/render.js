// Night Archive — canvas rendering.
// Draw order: floor, exit, keycards, cover, walls, vision cones (clipped
// to the walls by raycasting), guards, player, then a darkness overlay
// with a pool of light around the player so lit floor reads as safe and
// the dark reads as hidden. Screens (title, level clear, caught, win)
// are drawn as panels over the same scene.

import {
  ALERT_CHASE_AT,
  ALERT_SUSPICIOUS_AT,
  GUARD_HALF_VIEW_ANGLE,
  LEVEL_NAMES,
  PALETTE,
  TILE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';
import { guardAlertLabel } from './guards.js';
import { raycastSightDistance } from './detection.js';

// A seeded shuffle, so the floor speckle is the same on every load.
function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const floorCanvases = new Map();

function floorCanvas(level, seed) {
  const key = `${level.name}-${seed}`;
  if (floorCanvases.has(key)) return floorCanvases.get(key);
  const off = document.createElement('canvas');
  off.width = VIEW_WIDTH;
  off.height = VIEW_HEIGHT;
  const c = off.getContext('2d');
  for (let ty = 0; ty < level.rows; ty++) {
    for (let tx = 0; tx < level.cols; tx++) {
      c.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorLight : PALETTE.floorDark;
      c.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  const rand = mulberry32(seed);
  c.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 900; i++) {
    c.fillRect(rand() * VIEW_WIDTH, rand() * VIEW_HEIGHT, 2, 2);
  }
  floorCanvases.set(key, off);
  return off;
}

function drawExit(ctx, level) {
  const { x, y } = level.exit;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 64);
  glow.addColorStop(0, PALETTE.exitGlow);
  glow.addColorStop(1, 'rgba(57,217,138,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 64, y - 64, 128, 128);
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(x - 16, y - 20, 32, 40);
  ctx.fillStyle = '#0c2b1d';
  ctx.fillRect(x - 10, y - 14, 20, 28);
  ctx.fillStyle = PALETTE.exit;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', x, y - 26);
}

function drawKeycard(ctx, card) {
  const glow = ctx.createRadialGradient(card.x, card.y, 2, card.x, card.y, 30);
  glow.addColorStop(0, 'rgba(255,211,77,0.45)');
  glow.addColorStop(1, 'rgba(255,211,77,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(card.x - 30, card.y - 30, 60, 60);
  ctx.fillStyle = PALETTE.keycard;
  ctx.fillRect(card.x - 9, card.y - 6, 18, 12);
  ctx.fillStyle = '#7a5c00';
  ctx.fillRect(card.x - 6, card.y - 3, 7, 6);
}

function drawCoverAndWalls(ctx, level) {
  for (let ty = 0; ty < level.rows; ty++) {
    for (let tx = 0; tx < level.cols; tx++) {
      const ch = level.tiles[ty][tx];
      const px = tx * TILE;
      const py = ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(px, py, TILE, 4);
      } else if (ch === 'C') {
        ctx.fillStyle = PALETTE.crate;
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = PALETTE.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + TILE - 3, py + TILE - 3);
        ctx.moveTo(px + TILE - 3, py + 3);
        ctx.lineTo(px + 3, py + TILE - 3);
        ctx.stroke();
      } else if (ch === 'S') {
        ctx.fillStyle = PALETTE.shelf;
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = PALETTE.shelfEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.beginPath();
        ctx.moveTo(px + 2, py + TILE / 2);
        ctx.lineTo(px + TILE - 2, py + TILE / 2);
        ctx.stroke();
      }
    }
  }
}

function coneColour(guard) {
  if (guard.alert >= ALERT_CHASE_AT) return PALETTE.coneChase;
  if (guard.alert >= ALERT_SUSPICIOUS_AT) return PALETTE.coneSuspicious;
  return PALETTE.coneCalm;
}

function drawVisionCone(ctx, guard, level) {
  const viewDistance = level.viewDistance;
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i++) {
    const angle =
      guard.facing - GUARD_HALF_VIEW_ANGLE + (2 * GUARD_HALF_VIEW_ANGLE * i) / rays;
    const dist = raycastSightDistance(level, guard.x, guard.y, angle, viewDistance);
    ctx.lineTo(guard.x + Math.cos(angle) * dist, guard.y + Math.sin(angle) * dist);
  }
  ctx.closePath();
  ctx.fillStyle = coneColour(guard);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard) {
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + 3, guard.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.guard;
  ctx.fill();
  ctx.strokeStyle = PALETTE.guardDark;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Facing tick.
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(
    guard.x + Math.cos(guard.facing) * (guard.radius + 7),
    guard.y + Math.sin(guard.facing) * (guard.radius + 7),
  );
  ctx.strokeStyle = '#ffd9d4';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Alert marker and a thin alert arc over the guard.
  const label = guardAlertLabel(guard);
  if (label) {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = guard.alert >= ALERT_CHASE_AT ? '#ff5040' : '#ffb020';
    ctx.fillText(label, guard.x, guard.y - guard.radius - 8);
  }
  if (guard.alert > 1) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.alert) / 100);
    ctx.strokeStyle = guard.alert >= ALERT_CHASE_AT ? '#ff5040' : '#ffb020';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawPlayer(ctx, player) {
  ctx.beginPath();
  ctx.arc(player.x, player.y + 3, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.globalAlpha = player.sneaking ? 0.75 : 1;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.fill();
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(player.x, player.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.player;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(
    player.x + Math.cos(player.facing) * (player.radius + 5),
    player.y + Math.sin(player.facing) * (player.radius + 5),
  );
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (player.sneaking) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232,228,216,0.35)';
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

let darknessCanvas = null;

function drawDarkness(ctx, state) {
  // The darkness lives on its own canvas: the light pools are punched
  // out of the dark layer, then the layer is drawn over the scene.
  // (Punching holes straight into the main canvas would erase the game
  // underneath the light, not reveal it.)
  if (!darknessCanvas) {
    darknessCanvas = document.createElement('canvas');
    darknessCanvas.width = VIEW_WIDTH;
    darknessCanvas.height = VIEW_HEIGHT;
  }
  const d = darknessCanvas.getContext('2d');
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  d.fillStyle = PALETTE.darkness;
  d.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  d.globalCompositeOperation = 'destination-out';
  const punchLight = (x, y, r) => {
    const g = d.createRadialGradient(x, y, 10, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.beginPath();
    d.arc(x, y, r, 0, Math.PI * 2);
    d.fill();
  };
  punchLight(state.player.x, state.player.y, 250);
  punchLight(state.level.exit.x, state.level.exit.y, 110);
  ctx.drawImage(darknessCanvas, 0, 0);
}

function drawPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5,8,12,0.82)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  const w = 640;
  const h = 120 + lines.length * 30;
  const x = (VIEW_WIDTH - w) / 2;
  const y = (VIEW_HEIGHT - h) / 2;
  ctx.fillStyle = '#141a22';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || '#39434f';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(title, VIEW_WIDTH / 2, y + 62);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_WIDTH / 2, y + 108 + i * 30);
  });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawGame(ctx, state) {
  const { level } = state;
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.drawImage(floorCanvas(level, state.levelIndex + 7), 0, 0);
  drawExit(ctx, level);
  for (const card of level.keycards) {
    if (!card.taken) drawKeycard(ctx, card);
  }
  drawCoverAndWalls(ctx, level);
  for (const guard of state.guards) drawVisionCone(ctx, guard, level);
  for (const guard of state.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, state.player);
  drawDarkness(ctx, state);

  if (state.message) {
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.fillText(state.message, VIEW_WIDTH / 2, 36);
  }

  if (state.screen === 'title') {
    drawPanel(ctx, 'NIGHT ARCHIVE', [
      'A stealth game in three rooms. Slip past the guards,',
      'grab every keycard, and reach the green EXIT unseen.',
      '',
      'Move: WASD / arrows    Sneak: hold Shift (slower, quieter)',
      'Crates and shelves block a guard\'s sight — hide behind them.',
      'A guard\'s cone turns red as its alert rises. Break line of',
      'sight and the alert falls again. If a guard touches you,',
      'the attempt restarts.',
      '',
      'Press Enter or click to start.',
    ], '#2f6f5e');
  } else if (state.screen === 'paused') {
    drawPanel(ctx, 'PAUSED', ['Press Esc to keep sneaking.'], '#39434f');
  } else if (state.screen === 'levelclear') {
    const last = state.levelIndex + 1 >= LEVEL_NAMES.length;
    drawPanel(
      ctx,
      last ? 'ALL ROOMS CLEAR' : 'ROOM CLEAR',
      last
        ? [`You slipped out of every room in ${formatTime(state.totalTime + state.time)}.`, '', 'Press Enter to see your time.']
        : [`${state.levelName} cleared in ${formatTime(state.time)} — ${state.attempts} attempt(s).`, '', 'Press Enter for the next room.'],
      '#39d98a',
    );
  } else if (state.screen === 'caught') {
    drawPanel(ctx, 'SPOTTED!', [
      'A guard caught you in the open.',
      `${state.levelName} — attempt ${state.attempts}.`,
      '',
      'Watch the patrol, wait for the cone to turn away,',
      'and sneak behind cover.',
      '',
      'Press Enter to try again.',
    ], '#c94f42');
  } else if (state.screen === 'win') {
    drawPanel(ctx, 'YOU MADE IT OUT', [
      `All three rooms cleared in ${formatTime(state.totalTime + state.time)}.`,
      '',
      'Press Enter to play again.',
    ], '#39d98a');
  }
}
