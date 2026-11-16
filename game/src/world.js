// world.js — the field itself: parallax starfield, nebulae, drifting
// asteroids, and the wave director that spawns shards, mines and storms.

import { WORLD_W, WORLD_H, WAVE_SECONDS, showMessage } from './state.js';
import { pickRng, pickInt } from './util.js';

export function buildBackdrop(state) {
  const rng = state.rng;
  state.stars = [];
  for (let layer = 0; layer < 3; layer++) {
    const count = [90, 55, 28][layer];
    for (let i = 0; i < count; i++) {
      state.stars.push({
        x: rng() * WORLD_W,
        y: rng() * WORLD_H,
        r: 0.6 + layer * 0.55 + rng() * 0.7,
        tw: rng() * Math.PI * 2,
        layer,
      });
    }
  }
  state.nebulae = [
    { x: 220, y: 150, r: 260, hue: 258 },
    { x: 1050, y: 560, r: 300, hue: 190 },
    { x: 700, y: 90, r: 200, hue: 320 },
    { x: 90, y: 620, r: 180, hue: 28 },
  ];
  state.asteroids = [];
  for (let i = 0; i < 5; i++) spawnAsteroid(state, true);
}

export function spawnAsteroid(state, anywhere) {
  const rng = state.rng;
  const r = pickRng(rng, 22, 52);
  const edge = pickInt(rng, 0, 3);
  let x, y;
  if (anywhere) {
    x = rng() * WORLD_W;
    y = rng() * WORLD_H;
  } else if (edge === 0) {
    x = -r - 10; y = rng() * WORLD_H;
  } else if (edge === 1) {
    x = WORLD_W + r + 10; y = rng() * WORLD_H;
  } else if (edge === 2) {
    x = rng() * WORLD_W; y = -r - 10;
  } else {
    x = rng() * WORLD_W; y = WORLD_H + r + 10;
  }
  const speed = pickRng(rng, 12, 34);
  const a = Math.atan2(WORLD_H / 2 - y, WORLD_W / 2 - x) + pickRng(rng, -0.5, 0.5);
  state.asteroids.push({
    x, y, r,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    rot: rng() * Math.PI * 2,
    spin: pickRng(rng, -0.4, 0.4),
    bumps: Array.from({ length: 9 }, () => pickRng(rng, 0.78, 1.18)),
    shade: pickRng(rng, 0.5, 0.85),
  });
}

export function spawnShard(state, x, y) {
  const rng = state.rng;
  state.shards.push({
    x: x !== undefined ? x : 60 + rng() * (WORLD_W - 120),
    y: y !== undefined ? y : 90 + rng() * (WORLD_H - 180),
    vx: pickRng(rng, -14, 14),
    vy: pickRng(rng, -10, 10),
    r: 11,
    phase: rng() * Math.PI * 2,
    born: state.time,
  });
}

export function spawnMine(state, heavy) {
  const rng = state.rng;
  const edge = pickInt(rng, 0, 3);
  let x, y;
  const m = 30;
  if (edge === 0) { x = -m; y = rng() * WORLD_H; }
  else if (edge === 1) { x = WORLD_W + m; y = rng() * WORLD_H; }
  else if (edge === 2) { x = rng() * WORLD_W; y = -m; }
  else { x = rng() * WORLD_W; y = WORLD_H + m; }
  const tx = WORLD_W / 2 + pickRng(rng, -260, 260);
  const ty = WORLD_H / 2 + pickRng(rng, -180, 180);
  const a = Math.atan2(ty - y, tx - x);
  const speed = heavy ? pickRng(rng, 34, 52) : pickRng(rng, 52, 92);
  state.mines.push({
    x, y, r: heavy ? 22 : 15,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    hp: heavy ? 3 : 1,
    heavy: !!heavy,
    rot: rng() * Math.PI * 2,
    spin: pickRng(rng, -1.2, 1.2),
    pulse: rng() * Math.PI * 2,
  });
}

export function spawnComet(state) {
  const rng = state.rng;
  const fromLeft = rng() < 0.5;
  state.comets.push({
    x: fromLeft ? -40 : WORLD_W + 40,
    y: pickRng(rng, 40, WORLD_H - 40),
    vx: (fromLeft ? 1 : -1) * pickRng(rng, 380, 560),
    vy: pickRng(rng, -60, 60),
    r: pickRng(rng, 9, 15),
    hue: pickInt(rng, 0, 1) ? 32 : 190,
  });
}

export function spawnPickup(state, kind) {
  const rng = state.rng;
  state.pickups.push({
    x: 90 + rng() * (WORLD_W - 180),
    y: 110 + rng() * (WORLD_H - 220),
    vx: pickRng(rng, -10, 10),
    vy: pickRng(rng, -8, 8),
    r: 14,
    kind, // 'shield' | 'overdrive'
    phase: rng() * Math.PI * 2,
  });
}

// The wave director: raises the wave every WAVE_SECONDS, opens each wave
// with a shower of shards, drips mines in between, and fires a comet storm
// every third wave.
export function updateWorld(state, dt, audio) {
  // Backdrop drift
  for (const s of state.stars) s.tw += dt * 1.5;
  for (const a of state.asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.spin * dt;
    if (a.x < -90 || a.x > WORLD_W + 90 || a.y < -90 || a.y > WORLD_H + 90) {
      const i = state.asteroids.indexOf(a);
      state.asteroids.splice(i, 1);
      spawnAsteroid(state, false);
    }
  }

  state.waveTimer += dt;
  if (state.waveTimer >= WAVE_SECONDS) {
    state.waveTimer = 0;
    state.wave += 1;
    for (let i = 0; i < 5; i++) spawnShard(state);
    if (state.wave % 3 === 0) {
      state.stormWarnTimer = 2.0;
      showMessage(state, 'COMET STORM INCOMING', 2.0);
      audio.storm();
    } else {
      showMessage(state, 'WAVE ' + state.wave, 1.6);
      if (state.wave % 2 === 0) audio.waveClear();
    }
  }

  // Mine drip: faster as waves climb.
  state.mineClock -= dt;
  if (state.mineClock <= 0) {
    const cap = Math.min(4 + state.wave, 14);
    if (state.mines.length < cap) {
      spawnMine(state, state.rng() < Math.min(0.1 + state.wave * 0.02, 0.35));
    }
    state.mineClock = Math.max(0.7, 2.4 - state.wave * 0.14);
  }

  // Shard drip keeps the field worth sweeping.
  state.spawnClock -= dt;
  if (state.spawnClock <= 0) {
    if (state.shards.length < 12) spawnShard(state);
    state.spawnClock = 1.6;
  }

  // Storm warning counts down, then the storm runs its course.
  if (state.stormWarnTimer > 0) {
    state.stormWarnTimer -= dt;
    if (state.stormWarnTimer <= 0) {
      state.storm = true;
      state.stormTimer = 8;
      showMessage(state, 'COMET STORM!', 1.6);
    }
  }
  if (state.storm) {
    state.stormTimer -= dt;
    if (Math.random() < dt * 14) spawnComet(state);
    if (state.stormTimer <= 0) {
      state.storm = false;
      showMessage(state, 'STORM PASSED  +500', 1.8);
      state.score += 500;
    }
  }
}
