// Night Archive — keyboard input.
// WASD or arrow keys move; either Shift key sneaks. Arrow keys and Space
// are kept from scrolling the page. The game reads this through axis()
// and sneaking, so tests can drive the same update with a fake input.

export class KeyboardInput {
  constructor() {
    this.down = new Set();
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
    });
  }

  axis() {
    const left = this.down.has('ArrowLeft') || this.down.has('KeyA');
    const right = this.down.has('ArrowRight') || this.down.has('KeyD');
    const up = this.down.has('ArrowUp') || this.down.has('KeyW');
    const down = this.down.has('ArrowDown') || this.down.has('KeyS');
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
  }

  get sneaking() {
    return this.down.has('ShiftLeft') || this.down.has('ShiftRight');
  }
}

// A scripted stand-in for KeyboardInput, used by the self-test (?selftest=1)
// so the browser can play the game without a human at the keyboard.
export function fakeInput({ x = 0, y = 0, sneaking = false } = {}) {
  return {
    axis: () => ({ x, y }),
    sneaking,
  };
}
