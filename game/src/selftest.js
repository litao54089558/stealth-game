// Night Archive — in-browser self-test (?selftest=1).
// Drives the same update code the live game uses, with scripted inputs,
// and writes PASS/FAIL lines into a #selftest div (and the document
// title) so a headless browser run can read the verdict from the DOM.
// Nothing here is shipped as a cheat: it only exercises the real rules.

import { TILE } from './config.js';
import { StealthAudio } from './audio.js';
import { fakeInput } from './input.js';
import { createGame, startLevel, updateGame } from './state.js';
import { tileCenter } from './physics.js';

function step(state, input, seconds) {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) updateGame(state, input, 1 / 60);
}

export function runSelfTest() {
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
  };

  // 1. The player moves right on ArrowRight-style input.
  {
    const state = createGame(0, null);
    startLevel(state);
    const x0 = state.player.x;
    step(state, fakeInput({ x: 1 }), 1);
    check('player-moves-right', state.player.x > x0 + 50, `x ${x0.toFixed(0)} -> ${state.player.x.toFixed(0)}`);
  }

  // 2. Sneaking is slower than walking.
  {
    const a = createGame(0, null);
    startLevel(a);
    const ax0 = a.player.x;
    step(a, fakeInput({ x: 1 }), 1);
    const walkDist = a.player.x - ax0;
    const b = createGame(0, null);
    startLevel(b);
    const bx0 = b.player.x;
    step(b, fakeInput({ x: 1, sneaking: true }), 1);
    const sneakDist = b.player.x - bx0;
    check('sneak-is-slower', sneakDist < walkDist * 0.7, `walk ${walkDist.toFixed(0)} vs sneak ${sneakDist.toFixed(0)}`);
  }

  // 3. Guards walk their patrol routes.
  {
    const state = createGame(0, null);
    startLevel(state);
    const g = state.guards[0];
    const x0 = g.x;
    const y0 = g.y;
    step(state, fakeInput(), 3);
    const moved = Math.hypot(g.x - x0, g.y - y0);
    check('guard-patrols', moved > 40, `guard moved ${moved.toFixed(0)}px in 3s`);
  }

  // 4. Standing in a guard's cone raises the alert.
  {
    const state = createGame(0, null);
    startLevel(state);
    const g = state.guards[0];
    // Guard 0 starts at tile (9,2) facing east; put the player 100px ahead.
    state.player.x = g.x + 100;
    state.player.y = g.y;
    step(state, fakeInput(), 1);
    check('alert-rises-in-cone', g.alert > 20, `alert ${g.alert.toFixed(0)} after 1s in view`);
  }

  // 5. Out of sight, the alert falls again (a near miss is recoverable).
  {
    const state = createGame(0, null);
    startLevel(state);
    const g = state.guards[0];
    state.player.x = g.x + 100;
    state.player.y = g.y;
    step(state, fakeInput(), 1);
    const peak = g.alert;
    const start = tileCenter(1, 1);
    state.player.x = start.x;
    state.player.y = start.y;
    step(state, fakeInput(), 4);
    check('alert-decays-when-hidden', g.alert < 10, `peak ${peak.toFixed(0)} -> ${g.alert.toFixed(0)} after 4s hidden`);
  }

  // 6. A crate between guard and player blocks sight: no alert.
  {
    const state = createGame(0, null);
    startLevel(state);
    const g = state.guards[0];
    // Row 3: floor at (9,3), crate at (12,3), floor at (16,3).
    const guardAt = tileCenter(9, 3);
    const playerAt = tileCenter(16, 3);
    g.x = guardAt.x;
    g.y = guardAt.y;
    g.facing = 0;
    g.state = 'pause';
    g.pauseTimer = 99;
    state.player.x = playerAt.x;
    state.player.y = playerAt.y;
    step(state, fakeInput(), 1);
    check('crate-blocks-sight', g.alert < 5, `alert ${g.alert.toFixed(0)} with a crate in between`);
  }

  // 7. Reaching the exit clears the level.
  {
    const state = createGame(0, null);
    startLevel(state);
    state.player.x = state.level.exit.x;
    state.player.y = state.level.exit.y;
    step(state, fakeInput(), 1 / 60);
    check('exit-clears-level', state.screen === 'levelclear', `screen=${state.screen}`);
  }

  // 8. The exit stays locked until the keycard is taken (level 2).
  {
    const state = createGame(1, null);
    startLevel(state);
    state.player.x = state.level.exit.x;
    state.player.y = state.level.exit.y;
    step(state, fakeInput(), 1 / 60);
    const locked = state.screen === 'playing' && state.keycardsGot === 0;
    const card = state.level.keycards[0];
    state.player.x = card.x;
    state.player.y = card.y;
    step(state, fakeInput(), 1 / 60);
    const pickedUp = state.keycardsGot === 1;
    state.player.x = state.level.exit.x;
    state.player.y = state.level.exit.y;
    step(state, fakeInput(), 1 / 60);
    check(
      'keycard-unlocks-exit',
      locked && pickedUp && state.screen === 'levelclear',
      `locked=${locked} pickedUp=${pickedUp} screen=${state.screen}`,
    );
  }

  // 9. Audio calls are safe with no audio context (headless runs).
  {
    let ok = true;
    try {
      const audio = new StealthAudio();
      audio.playPlayerStep(100);
      audio.playGuardStep({ x: 0, y: 0 }, { x: 100, y: 100 });
      audio.playAlertSting();
      audio.playPickup();
      audio.playLevelClear();
      audio.playCaught();
      audio.playHeartbeat();
    } catch (err) {
      ok = false;
    }
    check('audio-safe-without-context', ok, ok ? 'no throw' : 'threw');
  }

  const passed = results.filter((r) => r.ok).length;
  const div = document.createElement('div');
  div.id = 'selftest';
  div.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;background:#111;color:#eee;font:12px monospace;padding:8px;white-space:pre;';
  div.textContent = results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`).join('\n');
  document.body.appendChild(div);
  document.title = `SELFTEST ${passed}/${results.length} ${passed === results.length ? 'PASS' : 'FAIL'}`;
  return { passed, total: results.length };
}
