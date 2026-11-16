// input.js — keyboard and mouse state for Starlight Salvage.
// Keys are edge-triggered through a small queue so a tap is never missed
// between fixed simulation steps; held keys are read live each step.

const GAME_KEYS = [
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space',
  'Enter', 'KeyR', 'KeyP', 'KeyM', 'Escape',
];

export function createInput(canvas) {
  const input = {
    held: new Set(),
    pressed: [],
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseClicked: false,
    // True while any thrust key is held.
    thrustX() {
      let x = 0;
      if (this.held.has('ArrowLeft') || this.held.has('KeyA')) x -= 1;
      if (this.held.has('ArrowRight') || this.held.has('KeyD')) x += 1;
      return x;
    },
    thrustY() {
      let y = 0;
      if (this.held.has('ArrowUp') || this.held.has('KeyW')) y -= 1;
      if (this.held.has('ArrowDown') || this.held.has('KeyS')) y += 1;
      return y;
    },
    firing() {
      return this.mouseDown || this.held.has('Space');
    },
    // Consume one queued press of the given code (Enter, KeyR, KeyP, KeyM).
    consume(code) {
      const i = this.pressed.indexOf(code);
      if (i >= 0) {
        this.pressed.splice(i, 1);
        return true;
      }
      return false;
    },
    consumeClick() {
      if (this.mouseClicked) {
        this.mouseClicked = false;
        return true;
      }
      return false;
    },
    // Called at the end of each simulation step: a press lives for one step.
    endStep() {
      this.pressed.length = 0;
      this.mouseClicked = false;
    },
    attach() {
      window.addEventListener('keydown', (e) => {
        if (GAME_KEYS.includes(e.code)) e.preventDefault();
        if (!e.repeat) {
          this.held.add(e.code);
          this.pressed.push(e.code);
        }
      });
      window.addEventListener('keyup', (e) => {
        this.held.delete(e.code);
      });
      window.addEventListener('blur', () => {
        this.held.clear();
      });
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
        this.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
      });
      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.mouseDown = true;
          this.mouseClicked = true;
        }
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouseDown = false;
      });
      // Touch: one finger steers toward the touch point, tap fires.
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const r = canvas.getBoundingClientRect();
        this.mouseX = ((t.clientX - r.left) / r.width) * canvas.width;
        this.mouseY = ((t.clientY - r.top) / r.height) * canvas.height;
        this.mouseDown = true;
        this.mouseClicked = true;
      }, { passive: false });
      canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.mouseDown = false;
      }, { passive: false });
    },
  };
  return input;
}
