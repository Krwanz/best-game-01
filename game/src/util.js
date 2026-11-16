// util.js — small math and random helpers shared by every Starlight Salvage module.
// No dependencies; plain ES module.

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Deterministic seeded random (mulberry32). The game uses one instance so a
// fixed seed replays the same field — screenshots and tests stay stable.
export function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRng(rng, min, max) {
  return min + rng() * (max - min);
}

export function pickInt(rng, min, max) {
  return Math.floor(pickRng(rng, min, max + 1));
}

export function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
