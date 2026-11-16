// player.js — the salvage skiff: thrust physics, aiming, firing, hits and
// the pickups that change how it flies.

import { WORLD_W, WORLD_H, breakCombo, showMessage } from './state.js';
import { clamp, dist2, angleTo, wrapAngle } from './util.js';

const ACCEL = 1500;
const MAX_SPEED = 430;
const FIRE_INTERVAL = 0.16;
const BOLT_SPEED = 780;

export function createPlayer() {
  return {
    x: WORLD_W / 2,
    y: WORLD_H / 2 + 120,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    r: 14,
    fireClock: 0,
    invuln: 0,
    shield: false,
    overdrive: 0,
    thrusting: false,
  };
}

export function resetPlayer(player) {
  player.x = WORLD_W / 2;
  player.y = WORLD_H / 2 + 120;
  player.vx = 0;
  player.vy = 0;
  player.angle = -Math.PI / 2;
  player.fireClock = 0;
  player.invuln = 2;
  player.shield = false;
  player.overdrive = 0;
}

export function updatePlayer(state, input, dt, audio, spawnParticles) {
  const p = state.player;
  if (!p) return;
  const tx = input.thrustX();
  const ty = input.thrustY();
  p.thrusting = tx !== 0 || ty !== 0;
  if (p.thrusting) {
    const len = Math.hypot(tx, ty) || 1;
    const boost = p.overdrive > 0 ? 1.5 : 1;
    p.vx += (tx / len) * ACCEL * boost * dt;
    p.vy += (ty / len) * ACCEL * boost * dt;
    // Thruster exhaust, spat backwards from the nose.
    if (Math.random() < dt * 60) {
      spawnParticles('thrust', p.x - Math.cos(p.angle) * 16, p.y - Math.sin(p.angle) * 16, p.vx, p.vy);
    }
  }
  // Drag keeps the skiff from sliding forever.
  p.vx *= Math.pow(0.12, dt);
  p.vy *= Math.pow(0.12, dt);
  const speed = Math.hypot(p.vx, p.vy);
  const max = MAX_SPEED * (p.overdrive > 0 ? 1.35 : 1);
  if (speed > max) {
    p.vx = (p.vx / speed) * max;
    p.vy = (p.vy / speed) * max;
  }
  p.x = clamp(p.x + p.vx * dt, 20, WORLD_W - 20);
  p.y = clamp(p.y + p.vy * dt, 20, WORLD_H - 20);

  // Aim at the mouse; on touch, aim along the direction of travel.
  if (input.mouseX || input.mouseY) {
    p.angle = angleTo(p.x, p.y, input.mouseX, input.mouseY);
  }

  if (p.invuln > 0) p.invuln -= dt;
  if (p.overdrive > 0) p.overdrive -= dt;

  // Fire: click, hold, or Space. Overdrive doubles the fire rate.
  p.fireClock -= dt;
  if (input.firing() && p.fireClock <= 0) {
    p.fireClock = p.overdrive > 0 ? FIRE_INTERVAL / 2 : FIRE_INTERVAL;
    const spread = (Math.random() - 0.5) * 0.06;
    state.bolts.push({
      x: p.x + Math.cos(p.angle) * 20,
      y: p.y + Math.sin(p.angle) * 20,
      vx: Math.cos(p.angle + spread) * BOLT_SPEED + p.vx * 0.3,
      vy: Math.sin(p.angle + spread) * BOLT_SPEED + p.vy * 0.3,
      r: 4,
      life: 0.85,
    });
    audio.laser();
  }
}

// A hit on the skiff: the shield eats it once, otherwise a life goes and
// the combo chain breaks. Returns 'dead' when the last life is gone.
export function hitPlayer(state, audio, spawnParticles) {
  const p = state.player;
  if (p.invuln > 0) return 'alive';
  if (p.shield) {
    p.shield = false;
    p.invuln = 1.5;
    state.shake = 14;
    showMessage(state, 'SHIELD DOWN', 1.2);
    audio.hurt();
    spawnParticles('burst', p.x, p.y, 0, 0, '#2dd4bf');
    return 'alive';
  }
  state.lives -= 1;
  state.shake = 22;
  state.flash = 0.35;
  breakCombo(state);
  audio.hurt();
  spawnParticles('burst', p.x, p.y, 0, 0, '#ff6b6b');
  spawnParticles('burst', p.x, p.y, 0, 0, '#ffb347');
  if (state.lives <= 0) return 'dead';
  p.invuln = 2.5;
  return 'alive';
}

export function applyPickup(state, kind, audio) {
  const p = state.player;
  if (kind === 'shield') {
    p.shield = true;
    showMessage(state, 'SHIELD UP', 1.4);
  } else if (kind === 'overdrive') {
    p.overdrive = 8;
    showMessage(state, 'OVERDRIVE!', 1.4);
  }
  audio.powerup();
}

export function drawPlayer(ctx, state) {
  const p = state.player;
  if (!p) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Blink while invulnerable so the player can see the grace period.
  if (p.invuln > 0 && Math.floor(state.time * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.rotate(p.angle);
  // Thruster flame
  if (p.thrusting) {
    const flick = 14 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-14 - flick, 0);
    ctx.lineTo(-14, 5);
    ctx.closePath();
    ctx.fillStyle = p.overdrive > 0 ? '#f472b6' : '#2dd4bf';
    ctx.fill();
  }
  // Hull: a swept salvage skiff in warm steel with a teal canopy.
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  const grad = ctx.createLinearGradient(-12, 0, 20, 0);
  grad.addColorStop(0, '#94a3b8');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#2dd4bf';
  ctx.fill();
  ctx.restore();
  // Shield ring
  if (p.shield) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 24 + Math.sin(state.time * 5) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  // Overdrive aura
  if (p.overdrive > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 + Math.sin(state.time * 9) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
