# Aryendra Shrestha — portfolio

A scroll-driven descent from a Himalayan summit, down through a sea of clouds,
into a candle-lit monastery with a prayer wheel you turn by hand. The sky is
the real one over Bangkok right now: sunset when it's sunset there, stars and
the moon in its true phase at night. Every project hangs on a thangka scroll at
`/projects`. Built with Next.js 14, React Three Fiber and a little GLSL.

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

Projects are listed newest first. Add a new one at the top and it appears at
the top of the scroll. Give it `featured: 1` (2, 3…) to show it on the home
page in that order; `private: true` hides the source link for a private repo.

## How it fits together

```
src/app/                 layout (fonts, metadata), page, 404, icons, social card
src/content/site.js      everything you'd want to edit
src/lib/scroll.js        scroll store shared by the DOM and the 3D scene
src/lib/wheel.js         the hand-turned prayer wheel: drag, flick, detents
src/lib/sky.js           where the sun and moon are over Bangkok, and the sky's clock
src/components/site/     HTML sections (server-rendered, readable without JS)
src/components/archive/  the /projects thangka scroll
src/components/three/    the WebGL scene
  Director.jsx           scroll -> camera path, act switch
  skyLight.js            sun altitude -> light, sky, fog and cloud colour
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
- **A live sky.** The sun's and moon's positions over Bangkok are worked out
  from the clock, and every colour in the mountain act follows the sun's
  altitude: alpenglow, midday, sunset, the blue hour, then stars and a
  moonlit (or moonless) night. The clock in the top right switches to the
  visitor's own hour or to dawn, day, sunset or night, as a short time-lapse.
  `?sky=night` (or `dawn`, `day`, `sunset`, `local`) opens on that sky.
- **A wheel you turn by hand.** Drag or swipe the prayer wheel and it spins on
  with some weight, then settles facing a card; the arrows, arrow keys or a
  click on a side card turn it too. It turns clockwise, as prayer wheels do,
  and with sound on, the bell on its frame rings once a revolution.
  `?wheel=scroll` brings back the scroll-driven version for comparison.
- **The scroll.** `/projects` hangs every project on a thangka: cotton in silk
  brocade with red and gold strips, a rolled veil and ribbons at the top. The
  heavy rod at the bottom stays on screen as you scroll, so the cloth unrolls
  out of it, and the roll thins as you near the end.
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
| `public/images/posters/*.webp` | the summit at dawn, day, sunset and night, rendered from the live scene (loading poster and fallback, picked by the hour) |
| `public/images/poster-hall.webp` | the monastery, for the fallback without WebGL |
| `public/images/projects/*` | project screenshots |
| `public/fonts/jomolhari-ornaments.woff2` | Jomolhari (OFL), cut down to Tibetan numerals and the mantra on the scroll |

`assets/source/` keeps the original, uncompressed models and the script that
prints the flags. None of it is deployed.
