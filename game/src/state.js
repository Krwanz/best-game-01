// state.js — the one place Starlight Salvage keeps its game state.
// Every module reads and writes this object; nothing else holds game data.

import { makeRng } from './util.js';

export const WORLD_W = 1280;
export const WORLD_H = 720;
export const COMBO_WINDOW = 3.0;
export const COMBO_MAX = 8;
export const WAVE_SECONDS = 20;

export function createState(seed) {
  return {
    // title | playing | paused | over
    screen: 'title',
    time: 0,
    rng: makeRng(seed || 1337),
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    lives: 3,
    wave: 1,
    waveTimer: 0,
    shardsCollected: 0,
    minesDestroyed: 0,
    storm: false,
    stormTimer: 0,
    stormWarnTimer: 0,
    shake: 0,
    flash: 0,
    message: '',
    messageTimer: 0,
    // Entities
    player: null,
    bolts: [],
    shards: [],
    mines: [],
    asteroids: [],
    comets: [],
    pickups: [],
    particles: [],
    texts: [],
    stars: [],
    nebulae: [],
    // Tuning that the wave director changes
    spawnClock: 0,
    mineClock: 0,
    over: false,
    overScore: 0,
    newBest: false,
  };
}

// Score for one shard at the current combo. The multiplier is the combo
// itself, so a chain of eight pays eight times a lone shard.
export function shardValue(state) {
  return 50 * Math.max(1, state.combo);
}

export function addCombo(state) {
  state.combo = Math.min(state.combo + 1, COMBO_MAX);
  state.comboTimer = COMBO_WINDOW;
  state.shardsCollected += 1;
}

export function breakCombo(state) {
  state.combo = 0;
  state.comboTimer = 0;
}

export function addScore(state, points) {
  state.score += points;
}

export function showMessage(state, text, seconds) {
  state.message = text;
  state.messageTimer = seconds || 2.2;
}
