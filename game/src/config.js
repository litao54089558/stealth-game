// Night Archive — shared tuning constants.
// One place for every number the other modules use, so a balance change
// never means hunting through the game code.

export const TILE = 40;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_WIDTH = COLS * TILE; // 1200
export const VIEW_HEIGHT = ROWS * TILE; // 800

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_SNEAK_SPEED = 72;
export const GUARD_RADIUS = 14;

export const GUARD_PATROL_SPEED = 56;
export const GUARD_INVESTIGATE_SPEED = 88;
export const GUARD_CHASE_SPEED = 134;
export const GUARD_PAUSE_SECONDS = 1.4;

export const GUARD_VIEW_DISTANCE = 210;
export const GUARD_HALF_VIEW_ANGLE = Math.PI / 5.4; // about 33 degrees each side
export const GUARD_SNEAK_VIEW_FACTOR = 0.62; // sneaking shrinks a guard's view

export const ALERT_RISE_NEAR = 96; // per second, player right in front of a guard
export const ALERT_RISE_FAR = 30; // per second, player at the edge of vision
export const ALERT_SNEAK_FACTOR = 0.45; // sneaking slows the rise
export const ALERT_DECAY_PER_SECOND = 26;
export const ALERT_SUSPICIOUS_AT = 35; // guard leaves patrol to investigate
export const ALERT_CHASE_AT = 75; // guard runs at the player
export const ALERT_MAX = 100;

export const CATCH_DISTANCE = 26;
export const EXIT_RADIUS = 30;
export const KEYCARD_RADIUS = 26;

export const STEP_INTERVAL_WALK = 0.42;
export const STEP_INTERVAL_SNEAK = 0.62;

export const LEVEL_NAMES = ['Reading Room', 'The Stacks', 'Vault Corridor'];

export const PALETTE = {
  floorLight: '#232a33',
  floorDark: '#1e242d',
  wall: '#12161d',
  wallTop: '#39434f',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3c',
  shelf: '#3d4a5c',
  shelfEdge: '#5a6b80',
  exit: '#39d98a',
  exitGlow: 'rgba(57,217,138,0.35)',
  keycard: '#ffd34d',
  player: '#e8e4d8',
  playerCloak: '#2f6f5e',
  guard: '#c94f42',
  guardDark: '#8e2f26',
  coneCalm: 'rgba(255,214,90,0.20)',
  coneSuspicious: 'rgba(255,166,40,0.30)',
  coneChase: 'rgba(255,64,48,0.34)',
  darkness: 'rgba(4,6,10,0.60)',
  text: '#e8e4d8',
  muted: '#9aa7b5',
};
