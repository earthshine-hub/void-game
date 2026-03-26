'use strict';

const Input = {
  _held: new Set(),
  _justPressed: new Set(),

  init() {
    window.addEventListener('keydown', (e) => {
      if (!Input._held.has(e.code)) Input._justPressed.add(e.code);
      Input._held.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      Input._held.delete(e.code);
    });
  },

  held(code)    { return Input._held.has(code); },
  pressed(code) { return Input._justPressed.has(code); },
  flush()       { Input._justPressed.clear(); }
};
