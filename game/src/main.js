// main.js — Starlight Salvage entry point: the fixed-step loop, screen
// flow, and the debug handle the play-tests and screenshots drive.

import { WORLD_W, WORLD_H, createState, showMessage } from './state.js';
import { buildBackdrop, updateWorld, spawnShard, spawnMine, spawnPickup, spawnVault } from './world.js';
import { createHunter } from './hunter.js';
import { createPlayer, resetPlayer, updatePlayer, drawPlayer } from './player.js';
import { updateEnemies } from './enemies.js';
import { createParticles, createFloatTexts } from './particles.js';
import { drawWorld, drawHud, drawTitle, drawPaused, drawGameOver, drawFlash } from './hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';

const STEP = 1 / 60;
const BEST_KEY = 'starlight-salvage-best';

const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get('seed') || '1337', 10) || 1337;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createState(seed);
const audio = createAudio();
const input = createInput(canvas);
const particles = createParticles();
const texts = createFloatTexts();

try {
  state.best = parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10) || 0;
} catch (e) {
  state.best = 0;
}

buildBackdrop(state);
state.player = createPlayer();
input.attach();

function spawnParticles(kind, x, y, vx, vy, color) {
  particles.spawn(kind, x, y, vx, vy, color);
}

function addText(x, y, text, color) {
  texts.add(x, y, text, color);
}

function startGame() {
  audio.ensure();
  audio.click();
  state.screen = 'playing';
  state.score = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.lives = 3;
  state.wave = 1;
  state.waveTimer = 0;
  state.shardsCollected = 0;
  state.minesDestroyed = 0;
  state.storm = false;
  state.stormTimer = 0;
  state.stormWarnTimer = 0;
  state.bolts = [];
  state.shards = [];
  state.mines = [];
  state.hunters = [];
  state.comets = [];
  state.pickups = [];
  state.newBest = false;
  state.over = false;
  resetPlayer(state.player);
  for (let i = 0; i < 8; i++) spawnShard(state);
  for (let i = 0; i < 4; i++) spawnMine(state, false);
  spawnVault(state);
  showMessage(state, 'WAVE 1 — SALVAGE!', 2.0);
}

function endGame() {
  state.screen = 'over';
  state.over = true;
  state.overScore = state.score;
  state.newBest = state.score > state.best && state.score > 0;
  if (state.newBest) {
    state.best = state.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(state.best));
    } catch (e) { /* private mode: the best score just lives for the session */ }
  }
  audio.gameOver();
}

function step(dt) {
  state.time += dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.4);
  if (state.messageTimer > 0) state.messageTimer -= dt;
  particles.update(dt);
  texts.update(dt);

  if (state.screen === 'title') {
    // The title screen is alive: shards drift behind the panel.
    for (const s of state.shards) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.phase += dt * 3;
      if (s.x < 16 || s.x > WORLD_W - 16) s.vx *= -1;
      if (s.y < 16 || s.y > WORLD_H - 16) s.vy *= -1;
    }
    if (state.shards.length < 7) spawnShard(state);
    if (input.consume('Enter') || input.consumeClick() || input.consume('Space')) startGame();
    return;
  }

  if (state.screen === 'paused') {
    if (input.consume('KeyP') || input.consumeClick() || input.consume('Escape')) {
      state.screen = 'playing';
      audio.click();
    }
    return;
  }

  if (state.screen === 'over') {
    if (input.consume('KeyR') || input.consumeClick() || input.consume('Enter')) startGame();
    return;
  }

  // Playing.
  if (input.consume('KeyP') || input.consume('Escape')) {
    state.screen = 'paused';
    audio.click();
    input.endStep();
    return;
  }
  if (input.consume('KeyM')) audio.toggleMute();

  // Combo decays when the chain goes quiet.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  updateWorld(state, dt, audio);
  updatePlayer(state, input, dt, audio, spawnParticles);
  updateEnemies(state, dt, audio, spawnParticles, addText, endGame);
  input.endStep();
}

function render() {
  ctx.save();
  if (state.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  if (state.screen === 'title') {
    drawTitle(ctx, state);
  } else if (state.screen === 'paused') {
    drawWorld(ctx, state);
    particles.draw(ctx);
    texts.draw(ctx);
    drawHud(ctx, state);
    drawPaused(ctx, state);
  } else if (state.screen === 'over') {
    drawWorld(ctx, state);
    particles.draw(ctx);
    texts.draw(ctx);
    drawGameOver(ctx, state);
  } else {
    drawWorld(ctx, state);
    particles.draw(ctx);
    texts.draw(ctx);
    drawHud(ctx, state);
  }
  ctx.restore();
  drawFlash(ctx, state);
}

// Fixed-step loop: the simulation advances in 1/60s slices no matter the
// display's refresh rate, so play feels the same on every machine.
let last = performance.now();
let acc = 0;
function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += elapsed;
  while (acc >= STEP) {
    step(STEP);
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}

// --- Shot presets: ?shot=title|play|storm|end arranges a scene for a
// screenshot, deterministically (seed 1337) so the frame is repeatable.
function arrangeShot(kind) {
  if (kind === 'title') return; // title is the boot screen already
  startGame();
  if (kind === 'play') {
    // A busy mid-game moment: combo already running, mines in view.
    state.score = 2450;
    state.combo = 5;
    state.comboTimer = 2.95;
    state.shardsCollected = 23;
    state.minesDestroyed = 6;
    state.wave = 2;
    state.player.x = 560;
    state.player.y = 400;
    state.player.vx = 120;
    for (let i = 0; i < 6; i++) spawnMine(state, false);
    spawnMine(state, true);
    for (let i = 0; i < 5; i++) spawnShard(state);
    spawnPickup(state, 'shield');
    spawnVault(state);
    state.hunters.push(createHunter(state, 1000, 120));
    // A few seconds of live play so bolts and particles are mid-flight.
    for (let i = 0; i < 120; i++) step(STEP);
    // Re-assert the combo for the frame: live frames keep running after the
    // staging, and a drifting mine could otherwise break the chain before
    // the screenshot lands. Clear hazards near the skiff, too.
    state.combo = 5;
    state.comboTimer = 2.95;
    // The staged hunter has spent two seconds chasing the skiff: park it
    // back out in the open so it shows in the frame without ramming the
    // player before the screenshot lands.
    if (state.hunters.length > 0) {
      state.hunters[0].x = 1000;
      state.hunters[0].y = 120;
    }
    for (let i = state.mines.length - 1; i >= 0; i--) {
      const m = state.mines[i];
      if (Math.hypot(m.x - state.player.x, m.y - state.player.y) < 200) state.mines.splice(i, 1);
    }
    for (let i = state.asteroids.length - 1; i >= 0; i--) {
      const a = state.asteroids[i];
      if (Math.hypot(a.x - state.player.x, a.y - state.player.y) < 200) state.asteroids.splice(i, 1);
    }
    // Two bolts mid-flight, fired toward the nearest mine.
    state.bolts.push({ x: state.player.x + 90, y: state.player.y - 30, vx: 700, vy: -160, r: 4, life: 0.8 });
    state.bolts.push({ x: state.player.x + 60, y: state.player.y + 10, vx: 720, vy: -40, r: 4, life: 0.8 });
  } else if (kind === 'storm') {
    state.score = 7310;
    state.combo = 7;
    state.comboTimer = 2.8;
    state.shardsCollected = 61;
    state.minesDestroyed = 18;
    state.wave = 3;
    state.player.x = 640;
    state.player.y = 430;
    state.player.invuln = 999; // the screenshot staging must not cost a life
    state.storm = true;
    state.stormTimer = 6.5;
    for (let i = 0; i < 9; i++) spawnMine(state, false);
    for (let i = 0; i < 7; i++) spawnShard(state);
    for (let i = 0; i < 90; i++) step(STEP);
    state.player.invuln = 0;
    // Comets are spawned by the storm clock; seed a visible streak too.
    for (let i = 0; i < 5; i++) {
      state.comets.push({
        x: 120 + i * 220, y: 60 + i * 90,
        vx: 460, vy: 40, r: 12, hue: i % 2 ? 32 : 190,
      });
    }
  } else if (kind === 'end') {
    state.score = 12450;
    state.shardsCollected = 84;
    state.minesDestroyed = 31;
    state.wave = 5;
    state.best = 18300;
    state.player.x = 640;
    state.player.y = 380;
    spawnParticles('burst', 640, 380, 0, 0, '#ff6b6b');
    spawnParticles('burst', 640, 380, 0, 0, '#ffb347');
    endGame();
    state.overScore = 12450;
  }
}

// Debug handle: the play-tests and the screenshot runs drive the game
// through this instead of guessing at pixels.
window.__salvage = {
  state,
  startGame,
  endGame,
  arrangeShot,
  spawnShard: (x, y) => spawnShard(state, x, y),
  spawnMine: (x, y) => {
    state.mines.push({ x, y, r: 15, vx: 0, vy: 0, hp: 1, heavy: false, rot: 0, spin: 0.5, pulse: 0 });
  },
  triggerStorm: () => {
    state.storm = true;
    state.stormTimer = 8;
  },
  setWave: (n) => { state.wave = n; },
  playerPos: () => ({ x: state.player.x, y: state.player.y }),
  step: (n) => { for (let i = 0; i < n; i++) step(STEP); },
};

const shot = params.get('shot');
if (shot) arrangeShot(shot);
requestAnimationFrame(frame);
