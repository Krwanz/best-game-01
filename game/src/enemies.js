// enemies.js — everything that drifts into the skiff's way, and the
// collisions: bolts vs mines, the skiff vs shards, mines, comets and
// asteroids, and pickups.

import { WORLD_W, WORLD_H, addCombo, addScore, shardValue, showMessage, COMBO_MAX } from './state.js';
import { dist2 } from './util.js';
import { hitPlayer, applyPickup } from './player.js';
import { spawnPickup } from './world.js';
import { updateHunters } from './hunter.js';

function removeAt(list, i) {
  list.splice(i, 1);
}

export function updateEnemies(state, dt, audio, spawnParticles, addText, onGameOver) {
  // Bolts fly straight and die young.
  for (let i = state.bolts.length - 1; i >= 0; i--) {
    const b = state.bolts[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > WORLD_W + 20 || b.y < -20 || b.y > WORLD_H + 20) {
      removeAt(state.bolts, i);
    }
  }
  // Hunters steer toward the skiff.
  updateHunters(state, dt);
  // Shards drift and shimmer — and a magnet pickup reels them in.
  const pl = state.player;
  for (const s of state.shards) {
    if (pl && pl.magnet > 0 && !s.vault) {
      const d = Math.hypot(pl.x - s.x, pl.y - s.y) || 1;
      s.vx += ((pl.x - s.x) / d) * 320 * dt;
      s.vy += ((pl.y - s.y) / d) * 320 * dt;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.phase += dt * 3;
    if (s.x < 16 || s.x > WORLD_W - 16) s.vx *= -1;
    if (s.y < 16 || s.y > WORLD_H - 16) s.vy *= -1;
  }
  // Mines tumble inward.
  for (let i = state.mines.length - 1; i >= 0; i--) {
    const m = state.mines[i];
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.rot += m.spin * dt;
    m.pulse += dt * 4;
    if (m.x < -60 || m.x > WORLD_W + 60 || m.y < -60 || m.y > WORLD_H + 60) {
      removeAt(state.mines, i);
    }
  }
  // Comets streak and fade off the far edge.
  for (let i = state.comets.length - 1; i >= 0; i--) {
    const c = state.comets[i];
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (c.x < -80 || c.x > WORLD_W + 80) removeAt(state.comets, i);
  }
  // Pickups bob gently.
  for (const pk of state.pickups) {
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    pk.phase += dt * 2;
    if (pk.x < 20 || pk.x > WORLD_W - 20) pk.vx *= -1;
    if (pk.y < 20 || pk.y > WORLD_H - 20) pk.vy *= -1;
  }

  // --- Collisions ---
  const p = state.player;
  if (!p) return;

  // Bolts vs mines.
  for (let i = state.bolts.length - 1; i >= 0; i--) {
    const b = state.bolts[i];
    let spent = false;
    for (let j = state.mines.length - 1; j >= 0; j--) {
      const m = state.mines[j];
      const rr = m.r + b.r;
      if (dist2(b.x, b.y, m.x, m.y) < rr * rr) {
        spent = true;
        m.hp -= 1;
        spawnParticles('spark', b.x, b.y, 0, 0, '#fde68a');
        if (m.hp <= 0) {
          const pts = m.heavy ? 250 : 100;
          addScore(state, pts);
          state.minesDestroyed += 1;
          addText(m.x, m.y, '+' + pts, '#fde68a');
          audio.explosion(m.heavy);
          spawnParticles('burst', m.x, m.y, 0, 0, '#ff6b6b');
          spawnParticles('burst', m.x, m.y, 0, 0, '#f59e0b');
          state.shake = Math.max(state.shake, m.heavy ? 10 : 6);
          removeAt(state.mines, j);
          // One in eight mines drops a pickup.
          if (state.rng() < 0.12) {
            const roll = state.rng();
            spawnPickup(state, roll < 0.34 ? 'shield' : roll < 0.67 ? 'overdrive' : 'magnet');
          }
        }
        break;
      }
    }
    if (spent) removeAt(state.bolts, i);
  }

  // Bolts vs hunters: two hits to kill, worth 200.
  for (let i = state.bolts.length - 1; i >= 0; i--) {
    const b = state.bolts[i];
    let spent = false;
    for (let j = state.hunters.length - 1; j >= 0; j--) {
      const h = state.hunters[j];
      const rr = h.r + b.r;
      if (dist2(b.x, b.y, h.x, h.y) < rr * rr) {
        spent = true;
        h.hp -= 1;
        spawnParticles('spark', b.x, b.y, 0, 0, '#fca5a5');
        if (h.hp <= 0) {
          addScore(state, 200);
          addText(h.x, h.y, '+200', '#fca5a5');
          audio.explosion(false);
          spawnParticles('burst', h.x, h.y, 0, 0, '#ef4444');
          spawnParticles('burst', h.x, h.y, 0, 0, '#f97316');
          state.shake = Math.max(state.shake, 8);
          removeAt(state.hunters, j);
        }
        break;
      }
    }
    if (spent) removeAt(state.bolts, i);
  }

  // Skiff vs shards: the heart of the loop.
  for (let i = state.shards.length - 1; i >= 0; i--) {
    const s = state.shards[i];
    const rr = s.r + p.r + 6;
    if (dist2(s.x, s.y, p.x, p.y) < rr * rr) {
      const wasMax = state.combo >= COMBO_MAX;
      const value = s.vault ? 500 : shardValue(state);
      addCombo(state);
      addScore(state, value);
      addText(s.x, s.y - 10, '+' + value + (s.vault ? ' VAULT' : '') + (state.combo > 1 ? ' x' + state.combo : ''), s.vault ? '#fde68a' : '#ffb347');
      audio.pickup(state.combo);
      spawnParticles('spark', s.x, s.y, 0, 0, s.vault ? '#fde68a' : '#ffb347');
      if (s.vault) {
        spawnParticles('burst', s.x, s.y, 0, 0, '#fbbf24');
        showMessage(state, 'VAULT CRACKED  +500', 1.8);
      }
      // First time the chain tops out, pay a bonus and say so.
      if (!wasMax && state.combo >= COMBO_MAX) {
        addScore(state, 250);
        showMessage(state, 'MAX COMBO!  +250', 1.8);
        spawnParticles('burst', p.x, p.y, 0, 0, '#ffb347');
      }
      removeAt(state.shards, i);
    }
  }

  // Skiff vs mines.
  for (let i = state.mines.length - 1; i >= 0; i--) {
    const m = state.mines[i];
    const rr = m.r + p.r - 2;
    if (dist2(m.x, m.y, p.x, p.y) < rr * rr) {
      removeAt(state.mines, i);
      audio.explosion(true);
      spawnParticles('burst', m.x, m.y, 0, 0, '#ff6b6b');
      if (hitPlayer(state, audio, spawnParticles) === 'dead') {
        onGameOver();
        return;
      }
    }
  }

  // Skiff vs hunters: a seeker ramming the hull costs a life like a mine.
  for (let i = state.hunters.length - 1; i >= 0; i--) {
    const h = state.hunters[i];
    const rr = h.r + p.r - 2;
    if (dist2(h.x, h.y, p.x, p.y) < rr * rr) {
      removeAt(state.hunters, i);
      audio.explosion(true);
      spawnParticles('burst', h.x, h.y, 0, 0, '#ef4444');
      if (hitPlayer(state, audio, spawnParticles) === 'dead') {
        onGameOver();
        return;
      }
    }
  }

  // Skiff vs comets.
  for (let i = state.comets.length - 1; i >= 0; i--) {
    const c = state.comets[i];
    const rr = c.r + p.r - 2;
    if (dist2(c.x, c.y, p.x, p.y) < rr * rr) {
      removeAt(state.comets, i);
      if (hitPlayer(state, audio, spawnParticles) === 'dead') {
        onGameOver();
        return;
      }
    }
  }

  // Skiff vs asteroids: a glancing bump costs a life too.
  for (const a of state.asteroids) {
    const rr = a.r * 0.85 + p.r - 4;
    if (dist2(a.x, a.y, p.x, p.y) < rr * rr) {
      // Push the skiff out so it does not stick inside the rock.
      const d = Math.hypot(p.x - a.x, p.y - a.y) || 1;
      p.x = a.x + ((p.x - a.x) / d) * rr;
      p.y = a.y + ((p.y - a.y) / d) * rr;
      if (hitPlayer(state, audio, spawnParticles) === 'dead') {
        onGameOver();
        return;
      }
    }
  }

  // Skiff vs pickups.
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    const rr = pk.r + p.r;
    if (dist2(pk.x, pk.y, p.x, p.y) < rr * rr) {
      applyPickup(state, pk.kind, audio);
      addText(pk.x, pk.y - 12, pk.kind === 'shield' ? 'SHIELD UP' : 'OVERDRIVE', '#2dd4bf');
      spawnParticles('spark', pk.x, pk.y, 0, 0, '#2dd4bf');
      removeAt(state.pickups, i);
    }
  }
}

// --- Drawing ---

export function drawShard(ctx, s, time) {
  const glow = 0.75 + Math.sin(s.phase) * 0.25;
  ctx.save();
  ctx.translate(s.x, s.y);
  // A vault shard wears a gold ring so the prize reads from across the field.
  if (s.vault) {
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 24 + Math.sin(s.phase * 2) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.scale(1.5, 1.5);
  }
  ctx.rotate(Math.sin(s.phase * 0.5) * 0.3);
  ctx.globalAlpha = glow;
  ctx.shadowColor = '#ffb347';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(4, -4);
  ctx.lineTo(11, 0);
  ctx.lineTo(4, 4);
  ctx.lineTo(0, 11);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMine(ctx, m, time) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.rot);
  const pulse = 0.6 + Math.sin(m.pulse) * 0.4;
  // Spikes
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (m.r - 2), Math.sin(a) * (m.r - 2));
    ctx.lineTo(Math.cos(a) * (m.r + 7), Math.sin(a) * (m.r + 7));
    ctx.stroke();
  }
  // Body
  const grad = ctx.createRadialGradient(-4, -5, 2, 0, 0, m.r);
  grad.addColorStop(0, '#64748b');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, m.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Hot core: brighter as it pulses, and redder when heavy.
  ctx.fillStyle = m.heavy ? '#dc2626' : `rgba(239, 68, 68, ${0.5 + pulse * 0.5})`;
  ctx.beginPath();
  ctx.arc(0, 0, m.heavy ? 7 : 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawComet(ctx, c) {
  ctx.save();
  const len = 70;
  const grad = ctx.createLinearGradient(c.x, c.y, c.x - Math.sign(c.vx) * len, c.y - (c.vy / Math.abs(c.vx)) * len);
  const hot = c.hue === 32 ? '255, 180, 80' : '80, 200, 255';
  grad.addColorStop(0, `rgba(${hot}, 0.95)`);
  grad.addColorStop(1, `rgba(${hot}, 0)`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = c.r * 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x - Math.sign(c.vx) * len, c.y - (c.vy / Math.abs(c.vx)) * len);
  ctx.stroke();
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPickup(ctx, pk) {
  ctx.save();
  ctx.translate(pk.x, pk.y);
  const bob = Math.sin(pk.phase) * 2;
  ctx.translate(0, bob);
  ctx.shadowColor = '#2dd4bf';
  ctx.shadowBlur = 12;
  ctx.fillStyle = pk.kind === 'shield' ? '#0d9488' : pk.kind === 'magnet' ? '#7c3aed' : '#db2777';
  ctx.beginPath();
  ctx.arc(0, 0, pk.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f0fdfa';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f0fdfa';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pk.kind === 'shield' ? 'S' : pk.kind === 'magnet' ? 'M' : 'O', 0, 1);
  ctx.restore();
}

export function drawBolt(ctx, b) {
  ctx.save();
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}
