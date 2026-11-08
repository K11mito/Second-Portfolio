# Aryendra Shrestha — portfolio

A scroll-driven descent from a Himalayan summit at dawn, down through a sea of
clouds at sunset, into a candle-lit monastery where a prayer wheel turns as you
scroll. Built with Next.js 14, React Three Fiber and a little GLSL.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

## Editing content

All copy, links and images live in **`src/content/site.js`**: the bio, facts,
projects, experience cards and social links. Nothing else needs to change to
add a project or an experience card (the card ring and the prayer wheel adapt
to however many experience entries there are).

## How it fits together

```
src/app/                 layout (fonts, metadata), page, 404, icons, social card
src/content/site.js      everything you'd want to edit
src/lib/scroll.js        scroll store shared by the DOM and the 3D scene
src/lib/ring.js          the detented turn shared by the card ring and the wheel
src/components/site/     HTML sections (server-rendered, readable without JS)
src/components/three/    the WebGL scene
  Director.jsx           scroll -> camera path, time of day, act switch
  Terrain.jsx            mountain rebuilt from a heightmap, snow shader, AO
  CloudSea.jsx           three noise layers that part around the peaks
  PrayerFlags.jsx        strings of lung-ta composed through the hero lens
  flags/cloth.js         Verlet rope + cloth (runs in a Web Worker)
  Monastery.jsx          prayer wheel, butter lamps, light shaft, dust
```

- **Native scrolling.** Content is ordinary HTML; the canvas is a fixed layer
  behind it. Sections opt in with `data-scene="…"`, are measured on load and
  resize, and the 3D timeline is anchored to those real positions, so it holds
  up on any screen size. [Lenis](https://github.com/darkroomengineering/lenis)
  smooths wheel scrolling; touch and `prefers-reduced-motion` stay native.
- **Progressive.** A painted poster of the scene shows instantly and stays as
  the fallback when WebGL is unavailable. Without JavaScript everything is
  still readable (the experience ring becomes a swipeable list).
- **Light.** About 2.3 MB of 3D assets in total, and the monastery streams in
  after the summit is already live.
- **Real cloth.** The prayer flags are a Verlet simulation: each flag's top
  row is part of the rope, so heavy flags sag the line and the line whips the
  flags, and the wind pushes hardest on cloth that faces it. It runs in a
  worker (scrolling never waits on it), only while the summit is in view, and
  steps down its own quality if a device can't keep up. Your cursor stirs the
  air.

## Assets

| File | What it is |
| --- | --- |
| `public/terrain/height.bin` | 362×362 16-bit heightmap baked from `assets/source/models/snowy_mountain.glb` |
| `public/terrain/snow-mask.webp` | the model's snow/rock erosion mask, used by the snow shader |
| `public/models/prayer_wheel.glb` | meshopt + WebP version of `assets/source/models/prayer_wheel.glb` |
| `public/textures/prayer-flags.webp` | the five lung-ta, fresh and weathered, woodblock-printed (wind horse, mantras, the four dignities); baked by `assets/source/flags/bake-flags.js` |
| `public/textures/cloud-puffs.webp` | soft cloud sprites |
| `public/images/poster-*.webp` | frames rendered from the live scene (loading poster and fallback) |

`assets/source/` keeps the original, uncompressed models and the script that
prints the flags. None of it is deployed.
