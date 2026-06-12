# Soccer

Browser-based replica of Nintendo Soccer (1985), hosted on Cloudflare Pages.

**Live:** https://soccer-game-b2g.pages.dev

## Controls

| Action | Key |
|---|---|
| Move | Arrow keys |
| Kick / Switch player | Z |
| Shoot (lofted) | X |
| Mute | M |

Mobile: on-screen d-pad + KICK/SHOOT buttons.

## Stack

- TypeScript + Vite
- Canvas 2D — 256×240 NES backbuffer, `image-rendering: pixelated`
- Fixed 60 Hz timestep game loop
- ZzFX inline audio synthesis (no audio files)
- Cloudflare Pages + Pages Functions + KV (leaderboard)

## Features

- 62 national teams with authentic kit colours
- 8 randomised character skins per player: Classic NES, Minecraft Steve, Roblox Noob, Among Us, Creeper, Mario, Ninja, Alien
- World Cup pool integration: `?team0=BRA&team1=FRA&match=A1&return=<url>` URL params, pre-match name entry, simulation result logging to KV
- 2-minute halves, own-goal protection, auto player switching

## Project layout

```
src/
  engine/         loop, renderer, input, audio, scene manager
  game/
    systems/      ball physics, collisions, rules, player control, camera
    ai/           coordinator, goalkeeper, field player, steering
    render/       pitch, sprites, hud
    scenes/       title, preMatch, match
    countries.ts  62 national team kits
  net/            leaderboard + simulation API clients
functions/
  api/scores.ts       Cloudflare Pages Function (GET/POST top-10 scores)
  api/simulations.ts  Cloudflare Pages Function (GET/POST simulation results)
```

## Dev

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + bundle → dist/
npm run test
```

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name soccer-game
```
