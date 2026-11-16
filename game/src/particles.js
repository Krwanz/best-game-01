// particles.js — pooled sparks, bursts and floating score text.
// One fixed pool: no allocations in the hot loop.

const MAX_PARTICLES = 420;

export function createParticles() {
  return {
    list: [],
    spawn(kind, x, y, vx, vy, color) {
      if (this.list.length >= MAX_PARTICLES) this.list.shift();
      const count = kind === 'burst' ? 22 : kind === 'spark' ? 8 : 1;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = kind === 'thrust' ? 40 + Math.random() * 60 : 60 + Math.random() * 240;
        this.list.push({
          x, y,
          vx: kind === 'thrust' ? vx * 0.2 + Math.cos(a) * sp * 0.4 : Math.cos(a) * sp,
          vy: kind === 'thrust' ? vy * 0.2 + Math.sin(a) * sp * 0.4 : Math.sin(a) * sp,
          life: kind === 'thrust' ? 0.25 + Math.random() * 0.15 : 0.4 + Math.random() * 0.5,
          maxLife: 0.9,
          size: kind === 'thrust' ? 2 + Math.random() * 2 : 2 + Math.random() * 3.5,
          color: kind === 'thrust' ? '#2dd4bf' : color || '#fbbf24',
        });
      }
    },
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const pt = this.list[i];
        pt.life -= dt;
        if (pt.life <= 0) {
          this.list.splice(i, 1);
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= Math.pow(0.1, dt);
        pt.vy *= Math.pow(0.1, dt);
      }
    },
    draw(ctx) {
      for (const pt of this.list) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export function createFloatTexts() {
  return {
    list: [],
    add(x, y, text, color) {
      this.list.push({ x, y, text, color, life: 1.1 });
    },
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const t = this.list[i];
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) this.list.splice(i, 1);
      }
    },
    draw(ctx) {
      ctx.save();
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const t of this.list) {
        ctx.globalAlpha = Math.min(1, t.life * 1.6);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.restore();
    },
  };
}
