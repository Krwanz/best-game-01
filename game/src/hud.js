// hud.js — everything drawn on top of the field: the parallax backdrop,
// the HUD, and the title, pause and game-over screens.

import { WORLD_W, WORLD_H, COMBO_WINDOW } from './state.js';
import { drawShard, drawMine, drawComet, drawPickup, drawBolt } from './enemies.js';
import { drawHunter } from './hunter.js';
import { drawPlayer } from './player.js';

function drawBackdrop(ctx, state) {
  // Deep indigo dusk.
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  sky.addColorStop(0, '#0b1030');
  sky.addColorStop(0.55, '#141b4a');
  sky.addColorStop(1, '#1e1445');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // Nebula washes.
  for (const n of state.nebulae) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, `hsla(${n.hue}, 70%, 55%, 0.16)`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  // Parallax starfield: deeper layers drift slower with the player.
  const px = state.player ? state.player.x - WORLD_W / 2 : 0;
  const py = state.player ? state.player.y - WORLD_H / 2 : 0;
  for (const s of state.stars) {
    const par = 0.02 + s.layer * 0.03;
    const x = ((s.x - px * par) % WORLD_W + WORLD_W) % WORLD_W;
    const y = ((s.y - py * par) % WORLD_H + WORLD_H) % WORLD_H;
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.tw));
    ctx.fillStyle = s.layer === 2 ? '#fef3c7' : '#e0e7ff';
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawAsteroid(ctx, a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.beginPath();
  for (let i = 0; i < a.bumps.length; i++) {
    const ang = (i / a.bumps.length) * Math.PI * 2;
    const r = a.r * a.bumps[i];
    if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
    else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath();
  ctx.fillStyle = `rgb(${Math.floor(70 * a.shade)}, ${Math.floor(66 * a.shade)}, ${Math.floor(96 * a.shade)})`;
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // A crater or two for texture.
  ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
  ctx.beginPath();
  ctx.arc(-a.r * 0.3, a.r * 0.2, a.r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWorld(ctx, state) {
  drawBackdrop(ctx, state);
  for (const a of state.asteroids) drawAsteroid(ctx, a);
  for (const s of state.shards) drawShard(ctx, s, state.time);
  for (const pk of state.pickups) drawPickup(ctx, pk);
  for (const m of state.mines) drawMine(ctx, m, state.time);
  for (const h of state.hunters) drawHunter(ctx, h, state.time);
  for (const c of state.comets) drawComet(ctx, c);
  for (const b of state.bolts) drawBolt(ctx, b);
  drawPlayer(ctx, state);
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export function drawHud(ctx, state) {
  ctx.save();
  ctx.textBaseline = 'top';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(String(state.score).padStart(6, '0'), 20, 14);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('BEST ' + String(Math.max(state.best, state.score)).padStart(6, '0'), 20, 48);
  // Combo, under the score: the chain is the game's heartbeat.
  if (state.combo > 1) {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('COMBO x' + state.combo, 20, 70);
    bar(ctx, 20, 98, 120, 8, state.comboTimer / COMBO_WINDOW, '#ffb347');
  }
  // Wave and shards, top centre — with the wave's theme underneath.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0e7ff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('WAVE ' + state.wave, WORLD_W / 2, 16);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('SHARDS ' + state.shardsCollected + '   MINES DOWN ' + state.minesDestroyed, WORLD_W / 2, 40);
  const typeColor = state.waveType === 'COMET STORM' ? '#fb923c' : state.waveType === 'MINE SURGE' ? '#f87171' : state.waveType === 'SHARD SHOWER' ? '#fbbf24' : '#94a3b8';
  ctx.fillStyle = typeColor;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(state.waveType || 'SALVAGE', WORLD_W / 2, 62);
  // Lives, top right: little skiffs.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('LIVES', WORLD_W - 20, 16);
  for (let i = 0; i < 3; i++) {
    const x = WORLD_W - 28 - i * 34;
    const y = 56;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fillStyle = i < state.lives ? '#e2e8f0' : 'rgba(100, 116, 139, 0.35)';
    ctx.fill();
    ctx.restore();
  }
  // Overdrive timer.
  if (state.player && state.player.overdrive > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('OVERDRIVE ' + state.player.overdrive.toFixed(1) + 's', WORLD_W - 20, 76);
  }
  if (state.player && state.player.magnet > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 15px system-ui, sans-serif';
    const my = state.player.overdrive > 0 ? 96 : 76;
    ctx.fillText('MAGNET ' + state.player.magnet.toFixed(1) + 's', WORLD_W - 20, my);
  }
  if (state.player && state.player.shield) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 15px system-ui, sans-serif';
    let sy = 76;
    if (state.player.overdrive > 0) sy += 20;
    if (state.player.magnet > 0) sy += 20;
    ctx.fillText('SHIELD READY', WORLD_W - 20, sy);
  }
  // Storm banner.
  if (state.storm) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('COMET STORM', WORLD_W / 2, 84);
  }
  // Centre message.
  if (state.messageTimer > 0) {
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, state.messageTimer * 1.5);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(state.message, WORLD_W / 2, WORLD_H / 2 - 140);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 14, 39, 0.82)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawTitle(ctx, state) {
  drawWorld(ctx, state);
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 25, 0.45)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  panel(ctx, WORLD_W / 2 - 360, 130, 720, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('A  S A L V A G E  A R C A D E', WORLD_W / 2, 162);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 58px system-ui, sans-serif';
  ctx.fillText('STARLIGHT', WORLD_W / 2, 210);
  ctx.fillStyle = '#2dd4bf';
  ctx.fillText('SALVAGE', WORLD_W / 2, 274);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Pilot a salvage skiff through the drifting field. Sweep up star-shards,', WORLD_W / 2, 348);
  ctx.fillText('chain them into combos, crack the vaults, dodge the seekers — and ride out', WORLD_W / 2, 372);
  ctx.fillText('comet storms, mine surges and shard showers, wave after wave.', WORLD_W / 2, 396);
  ctx.fillStyle = '#e0e7ff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('WASD / ARROWS — fly      MOUSE — aim      CLICK / SPACE — fire', WORLD_W / 2, 420);
  ctx.fillText('P — pause      M — mute      R — restart', WORLD_W / 2, 446);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const blink = 0.65 + Math.sin(state.time * 4) * 0.35;
  ctx.globalAlpha = blink;
  ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', WORLD_W / 2, 506);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px system-ui, sans-serif';
  if (state.best > 0) ctx.fillText('BEST SCORE  ' + state.best, WORLD_W / 2, 540);
  ctx.restore();
}

export function drawPaused(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 25, 0.6)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  panel(ctx, WORLD_W / 2 - 240, WORLD_H / 2 - 90, 480, 180);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('PAUSED', WORLD_W / 2, WORLD_H / 2 - 58);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press P or click to keep flying', WORLD_W / 2, WORLD_H / 2 + 8);
  ctx.restore();
}

export function drawGameOver(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 25, 0.55)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  panel(ctx, WORLD_W / 2 - 320, 170, 640, 400);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('SKIFF LOST', WORLD_W / 2, 214);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('The field keeps your shards. The skiff is gone —', WORLD_W / 2, 270);
  ctx.fillText('but the salvage run is yours to take back.', WORLD_W / 2, 294);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('SCORE  ' + state.overScore, WORLD_W / 2, 340);
  ctx.fillStyle = state.newBest ? '#ffb347' : '#94a3b8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(state.newBest ? 'NEW BEST SCORE!' : 'BEST  ' + state.best, WORLD_W / 2, 386);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('WAVE ' + state.wave + '   •   SHARDS ' + state.shardsCollected + '   •   MINES DOWN ' + state.minesDestroyed, WORLD_W / 2, 420);
  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const blink = 0.65 + Math.sin(state.time * 4) * 0.35;
  ctx.globalAlpha = blink;
  ctx.fillText('PRESS R OR CLICK TO SALVAGE AGAIN', WORLD_W / 2, 500);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawFlash(ctx, state) {
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 60, ${Math.min(0.35, state.flash)})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
  // Vignette: keeps the edges moody and the centre readable.
  const vg = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.42, WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.85);
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(2, 4, 18, 0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}
