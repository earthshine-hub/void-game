'use strict';

(async function main() {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  // Scale canvas to fit viewport while preserving 16:9
  function resize() {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    canvas.style.width  = Math.floor(1280 * scale) + 'px';
    canvas.style.height = Math.floor(720  * scale) + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  Input.init();
  Audio.init();

  // Load assets
  const fill = document.getElementById('loadingFill');
  const txt  = document.getElementById('loadingText');
  await Loader.loadAll(ASSET_MANIFEST, (p) => {
    fill.style.width = (p * 100).toFixed(0) + '%';
    txt.textContent  = 'Loading assets... ' + (p * 100).toFixed(0) + '%';
  });

  document.getElementById('loadingScreen').style.display = 'none';

  // Kick off at start screen
  SceneManager.set(StartScene.init());

  // Game loop
  let last = 0;
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    SceneManager.update(dt);

    ctx.clearRect(0, 0, 1280, 720);
    SceneManager.render(ctx);

    Input.flush();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame((now) => { last = now; requestAnimationFrame(loop); });
})();
