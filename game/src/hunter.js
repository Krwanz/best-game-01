// hunter.js — the seeker drone: the one enemy in Starlight Salvage that
// hunts the skiff instead of drifting past it. From wave 2 on, the wave
// director lets a few loose; they steer toward the player with a capped
// turn rate and a wobble, so they are dodgeable but never ignorable. A
// hunter takes two bolts to kill and is worth 200 points.

import { WORLD_W, WORLD_H } from './state.js';
import { clamp, angleTo, wrapAngle } from './util.js';

const BASE_SPEED = 150;
const SPEED_PER_WAVE = 9;
const MAX_SPEED = 245;
const TURN_RATE = 2.6;

export function createHunter(state, x, y) {
  const speed = Math.min(BASE_SPEED + state.wave * SPEED_PER_WAVE, MAX_SPEED);
  return {
    x, y,
    r: 13,
    hp: 2,
    speed,
    angle: angleTo(x, y, state.player.x, state.player.y),
    wobble: state.rng() * Math.PI * 2,
    rot: 0,
    pulse: 0,
  };
}

// Steer toward the skiff, capped turn rate, sine wobble on the heading.
export function updateHunters(state, dt) {
  const p = state.player;
  if (!p) return;
  for (const h of state.hunters) {
    const want = angleTo(h.x, h.y, p.x, p.y);
    const diff = wrapAngle(want - h.angle);
    const turn = clamp(diff, -TURN_RATE * dt, TURN_RATE * dt);
    h.angle += turn;
    h.wobble += dt * 3.1;
    const lunge = Math.hypot(p.x - h.x, p.y - h.y) < 260 ? 1.25 : 1;
    const wob = Math.sin(h.wobble) * 0.35;
    h.x += Math.cos(h.angle + wob) * h.speed * lunge * dt;
    h.y += Math.sin(h.angle + wob) * h.speed * lunge * dt;
    h.x = clamp(h.x, 16, WORLD_W - 16);
    h.y = clamp(h.y, 16, WORLD_H - 16);
    h.rot += dt * 2;
    h.pulse += dt * 5;
  }
}

// A red dart with a hot eye: readable at a glance, distinct from the grey
// spiked mines and the amber shards.
export function drawHunter(ctx, h, time) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.angle);
  const flick = h.hp === 1 ? 0.55 + Math.sin(h.pulse) * 0.45 : 1;
  ctx.globalAlpha = flick;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 14;
  // Dart body.
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  const grad = ctx.createLinearGradient(-10, 0, 17, 0);
  grad.addColorStop(0, '#7f1d1d');
  grad.addColorStop(1, '#f97316');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Eye.
  ctx.fillStyle = '#fef2f2';
  ctx.beginPath();
  ctx.arc(6, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Damaged hunters spark: one hit left is visible from across the field.
  if (h.hp === 1) {
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(h.pulse * 2) * 0.3;
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 18 + Math.sin(h.pulse) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
