// Night Archive — the guards.
// Each guard walks a fixed patrol loop (so a player can learn the route),
// pauses at every waypoint to look around, and reacts to what it sees:
//   alert < 35   patrol — walks its route, cone calm yellow
//   alert 35-74  suspicious — walks to the last place it saw the player
//   alert >= 75  chase — runs at the player; touch the player and the
//                  level restarts
// Out of sight the alert falls again, so a near miss is recoverable.

import {
  ALERT_CHASE_AT,
  ALERT_DECAY_PER_SECOND,
  ALERT_MAX,
  ALERT_SUSPICIOUS_AT,
  CATCH_DISTANCE,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_PAUSE_SECONDS,
  GUARD_RADIUS,
} from './config.js';
import { alertRisePerSecond, guardSeesPlayer } from './detection.js';
import { moveCircle } from './physics.js';

export function createGuard(spawn, level, patrolSpeed) {
  const start = spawn.waypoints[0];
  return {
    x: start.x,
    y: start.y,
    radius: GUARD_RADIUS,
    waypoints: spawn.waypoints,
    waypointIndex: 1 % spawn.waypoints.length,
    patrolSpeed,
    state: 'patrol', // patrol | pause | investigate | chase | return
    facing: 0,
    alert: 0,
    lastSeen: null,
    pauseTimer: 0,
    scanTimer: 0,
    scanDirection: 1,
    lostSightTimer: 0,
    stepTimer: 0,
    investigateTimer: 0,
  };
}

function moveToward(guard, level, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const moved = moveCircle(level, guard, guard.radius, (dx / dist) * step, (dy / dist) * step);
  if (moved) guard.facing = Math.atan2(dy, dx);
  return dist - step < 2;
}

// hooks: { onGuardStep(guard), onSpotted(guard), onCaught(guard) }
export function updateGuard(guard, player, level, dt, viewDistance, hooks) {
  const sight = guardSeesPlayer(guard, player, level, viewDistance);

  // Alert rises while the player is in the cone, falls once hidden.
  if (sight.sees) {
    const before = guard.alert;
    guard.alert = Math.min(
      ALERT_MAX,
      guard.alert + alertRisePerSecond(sight.closeness, player.sneaking) * dt,
    );
    guard.lastSeen = { x: player.x, y: player.y };
    guard.lostSightTimer = 0;
    if (before < ALERT_CHASE_AT && guard.alert >= ALERT_CHASE_AT && hooks.onSpotted) {
      hooks.onSpotted(guard);
    }
  } else {
    guard.alert = Math.max(0, guard.alert - ALERT_DECAY_PER_SECOND * dt);
    guard.lostSightTimer += dt;
  }

  // State changes follow the alert.
  if (guard.alert >= ALERT_CHASE_AT) {
    if (guard.state !== 'chase') guard.state = 'chase';
  } else if (guard.alert >= ALERT_SUSPICIOUS_AT) {
    if (guard.state === 'patrol' || guard.state === 'pause' || guard.state === 'return') {
      guard.state = 'investigate';
    }
  } else if (guard.state === 'chase' || guard.state === 'investigate') {
    if (guard.lostSightTimer > 2.5) guard.state = 'return';
  }

  // Movement for the current state.
  let moving = false;
  if (guard.state === 'patrol') {
    const target = guard.waypoints[guard.waypointIndex];
    const arrived = moveToward(guard, level, target.x, target.y, guard.patrolSpeed, dt);
    moving = true;
    if (arrived) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.state = 'pause';
      guard.pauseTimer = GUARD_PAUSE_SECONDS;
      guard.scanTimer = 0;
    }
  } else if (guard.state === 'pause') {
    guard.pauseTimer -= dt;
    guard.scanTimer += dt;
    // Slowly sweep the view left and right while standing still.
    guard.facing += guard.scanDirection * 0.9 * dt;
    if (guard.scanTimer > 1.1) {
      guard.scanTimer = 0;
      guard.scanDirection *= -1;
    }
    if (guard.pauseTimer <= 0) guard.state = 'patrol';
  } else if (guard.state === 'investigate') {
    if (guard.lastSeen) {
      const arrived = moveToward(
        guard, level, guard.lastSeen.x, guard.lastSeen.y, GUARD_INVESTIGATE_SPEED, dt,
      );
      moving = true;
      if (arrived) {
        guard.investigateTimer += dt;
        guard.facing += 1.4 * dt; // look around the spot
        if (guard.investigateTimer > 2.2) {
          guard.investigateTimer = 0;
          guard.state = 'return';
        }
      }
    } else {
      guard.state = 'return';
    }
  } else if (guard.state === 'chase') {
    // Chase the player's live position while seen, else the last seen spot.
    const target = sight.sees ? player : guard.lastSeen;
    if (target) {
      moveToward(guard, level, target.x, target.y, GUARD_CHASE_SPEED, dt);
      moving = true;
    }
    if (guard.alert < ALERT_SUSPICIOUS_AT && guard.lostSightTimer > 2.5) {
      guard.state = 'return';
    }
  } else if (guard.state === 'return') {
    // Walk back to the nearest waypoint, then resume the patrol.
    let nearest = 0;
    let nearestDist = Infinity;
    guard.waypoints.forEach((wp, i) => {
      const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    const target = guard.waypoints[nearest];
    const arrived = moveToward(guard, level, target.x, target.y, guard.patrolSpeed, dt);
    moving = true;
    if (arrived) {
      guard.waypointIndex = (nearest + 1) % guard.waypoints.length;
      guard.state = 'patrol';
    }
  }

  // Footsteps while walking, so the player hears a guard coming.
  if (moving) {
    guard.stepTimer += dt;
    if (guard.stepTimer >= 0.55) {
      guard.stepTimer = 0;
      if (hooks.onGuardStep) hooks.onGuardStep(guard);
    }
  } else {
    guard.stepTimer = 0;
  }

  // Caught: a guard close enough to touch the player ends the attempt.
  const distToPlayer = Math.hypot(player.x - guard.x, player.y - guard.y);
  if (distToPlayer < CATCH_DISTANCE && hooks.onCaught) hooks.onCaught(guard);
}

export function guardAlertLabel(guard) {
  if (guard.alert >= ALERT_CHASE_AT) return '!';
  if (guard.alert >= ALERT_SUSPICIOUS_AT) return '?';
  return '';
}
