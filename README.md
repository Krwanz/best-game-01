# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Krwanz/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Krwanz/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Starlight Salvage** — a top-down 2D canvas arcade game. Pilot a salvage skiff through a drifting asteroid field at dusk: sweep up glowing star-shards and chain them into combos, crack vault shards ringed by mines for +500, split fission mines that burst into two fast mini-mines when cracked, dodge seeker drones that hunt the skiff — and telegraph their lunge with a red ring before they shoot in — blast drifting mines, grab a nova pickup to detonate the whole field at once, and ride out the wave cycle: comet storms, mine surges and shard showers, one after another. Three lives, escalating waves, shield, overdrive, magnet and nova pickups, a best score that persists, and a full start–play–pause–game-over loop with WebAudio-synthesised sound. All art is procedural canvas drawing; no network anywhere.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Controls: WASD / arrows to fly, mouse to aim, click or Space to fire, P to pause, M to mute, R to restart after game over.

## How it works

- `game/src/main.js` — the fixed-step loop, screen flow, and shot presets
- `game/src/state.js` — the one state object every module shares
- `game/src/world.js` — parallax starfield, asteroids, vaults, and the wave director (comet storm / mine surge / shard shower cycle)
- `game/src/player.js` — the skiff: thrust physics, firing, hits, pickups
- `game/src/enemies.js` — shards, mines (normal, heavy, splitter, mini), comets, pickups (shield, overdrive, magnet, nova), and collisions
- `game/src/hunter.js` — the seeker drone: steering, telegraphed lunge, and drawing
- `game/src/particles.js` — pooled sparks, bursts, and floating score text
- `game/src/hud.js` — backdrop, HUD, and the title / pause / game-over screens
- `game/src/audio.js` — every sound synthesised with WebAudio, no audio files
- `game/src/input.js` — keyboard and mouse state
- `game/src/util.js` — math and seeded-random helpers
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes the dossier with the vendored make.fun library

---

<sub>Entered on [make.fun](https://make.fun/?ref=a15ed58m&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
