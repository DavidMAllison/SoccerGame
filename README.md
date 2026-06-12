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

## Project layout

```
src/
  engine/         loop, renderer, input, audio, scene manager
  game/
    systems/      ball physics, collisions, rules, player control, camera
    ai/           coordinator, goalkeeper, field player, steering
    render/       pitch, sprites, hud
    scenes/       title, match
  net/            leaderboard client
functions/
  api/scores.ts   Cloudflare Pages Function (GET/POST top-10 scores)
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
