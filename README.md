# Aryendra Shrestha — portfolio

A Himalayan summit above a sea of clouds. Scroll down past who I am to
"Where to now?": the mountain with its three destinations, a monastery at its
foot, half in the cloud, whose library shelves every project as a Tibetan book
(`/projects`), a temple on a peak of its own, where a prayer wheel you turn by
hand holds my experience (`/experience`), and the very top, where visitors
pull a register's lever to be counted and pin notes to a board (`/summit`).
Choose one and the camera flies there. The sky is the real one over Bangkok right now: sunset when
it's sunset there, stars and the moon in its true phase at night, and the
monasteries' lamps lit after dark. Built with Next.js 14, React Three Fiber,
three.js and a little GLSL.

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

Projects are listed newest first. Add a new one at the top and it is shelved
first in the library; the bookcase re-lays itself for any number of projects.
Give it `featured: 1` (2, 3…) to wrap it in yellow silk in the library, among
the precious texts; `private: true` hides the source
link for a private repo; `short` is the title inked on its tag in the library,
for titles too long to fit.

## How it fits together

```
src/app/                 layout (fonts, metadata), pages (/, /projects, /experience, /summit), 404, icons, social card
src/app/api/summit/      the register's API: the count and notes, a pull, a note, and taking one down
src/app/summit/admin/    the private page for taking a note down
src/content/site.js      everything you'd want to edit
src/lib/scroll.js        scroll store shared by the DOM and the 3D scene
src/lib/journey.js       the way to a destination and back: one timeline for camera, veil and page
src/lib/wheel.js         the hand-turned prayer wheel: drag, flick, detents
src/lib/sky.js           where the sun and moon are over Bangkok, and the sky's clock
src/lib/summitStore.js   the register's store: Redis (Upstash) over REST, or memory in development
src/lib/summitClient.js  the register as the page and the scene see it
src/components/site/     HTML sections (server-rendered, readable without JS),
                         and Ornament.jsx, the Tibetan card border
  HomePage.jsx           the mountain: hero, about, where to now?, contact
  Destinations.jsx       "Where to now?" and the signs over the monasteries
  Journey.jsx            runs the journeys: history, the library over the page
  Experience.jsx         the prayer-wheel temple's ring of cards
  SummitRegister.jsx     the summit: the lever, the count, the board of notes
src/components/library/  the /projects library
  createLibrary.js       the bookcase and the wrapped texts, in plain three.js
  Library.jsx            the page around it: caption, glossary, reading leaf
  pecha.js               numbering, Tibetan numerals, how the shelf is laid out
src/components/three/    the WebGL scene
  Director.jsx           scroll -> camera path; the flights to the doors; act switch
  gompa.js               the monasteries, built in code from Tibetan parts
  Gompas.jsx             puts them on the mountain, lights their lamps, pins the signs
  terrainData.js         the shared heightmap, with the temple's peak raised in it
  Summit.jsx, summitKit.js  the register on the top, its cairn, flags and butter lamp
  summitBoard.js         the board of notes there: planks under a snowy roof, a lantern, a khata
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
- **Where to now?** The mountain's three destinations wear small hovering
  signs, plain links pinned over them by the scene every frame. Choose one and
  the camera flies there along a curve that arrives head-on: into the dark of
  the library (which opens over the page, the mountain resting behind it),
  through a drift of cloud to the temple's prayer-wheel hall, or up to the
  register on the summit. The address bar follows (`/projects`, `/experience`,
  `/summit`), so the browser's back button, Escape or "← The mountain" fly you
  back out to the same view, and a reload lands you there. Without WebGL the
  signs are ordinary links.
- **The summit register.** On the very top stands a counter like the ones on
  real summits, with a lever on its side, beside a cairn flying prayer flags
  (and, after dark, a butter lamp to read it by). Drag the lever down, or
  press "Pull the lever": it counts each visitor once (by a cookie), and its
  number wheels roll up. Beside it stands a notice board under a snowy roof,
  with a lantern under the eave and a khata knotted round a post: walk over
  and the notes are pinned to it, each in its writer's hand, lifting in the
  wind; click one to read it. Write one on a slip of paper and it is carried
  over and pressed onto a tack. Notes go up as written, as plain text, a few a
  day per visitor and per network, and can be taken down at `/summit/admin`.
  Without WebGL the board is a list on the page.
- **Monasteries built in code.** `gompa.js` assembles them from the real
  vocabulary: battered whitewashed walls on foundations that step down to the
  rock, the maroon pembé frieze with gilded discs, black trapezoid windows,
  rabsel balconies, gilded roofs with curling eaves, victory banners, the
  Dharma wheel between two deer, chortens and strings of prayer flags. Each
  complex merges into about a dozen draw calls; after dusk its windows light
  up and a warm haze hangs around it.
- **A wheel you turn by hand.** When you reach the temple, the experience
  cards come out of the prayer wheel itself: they unspool from the drum's axis
  as it turns and settle into a ring (the 3D scene reports where the drum is
  on screen, so they leave from the right spot on any device). Then drag or
  swipe the wheel and it spins on with some weight, settling facing a card;
  the arrows, arrow keys or a click on a side card turn it too. It turns
  clockwise, as prayer wheels do, and with sound on, the bell on its frame
  rings once a revolution.
- **Tibetan borders.** The cards wear a vector border after the original
  site's corner pieces: interlaced square links where a double rule turns,
  with cloud-collar scallops (`Ornament.jsx`). Hover one and it glows white,
  and its rules reach along each edge until they meet at a jewel.
- **The library.** `/projects` is one wall of a monastery library: a
  weathered, red-painted bookcase of uneven pigeonholes, every project wrapped
  as a pecha (loose leaves between wooden boards, in cloth, with a brocade face
  and a gauze tag). Rest the cursor on one and it lifts and glows; open it and
  it is carried out, unwrapped, and its top leaf rises to become the page you
  read. The favourites are in yellow silk. Everything is painted in code: no
  models, no textures to load. Without WebGL (or JS) the page is a plain list.
- **Real cloth.** The prayer flags are a Verlet simulation: each flag's top
  row is part of the rope, so heavy flags sag the line and the line whips the
  flags, and the wind pushes hardest on cloth that faces it. It runs in a
  worker (scrolling never waits on it), only while the summit is in view, and
  steps down its own quality if a device can't keep up. Your cursor stirs the
  air.

## The summit's register

The count and the notes are kept in Redis. Without one, development keeps
them in memory (so the summit can be tried locally), preview deployments do
the same (forgetting now and then), and the live site says the register opens
soon. To open it:

1. In Vercel, open the project's **Storage** tab (or the Marketplace), add
   **Upstash for Redis** (the free plan is plenty) and connect it to this
   project, for the Production environment. Any Redis works: the register
   finds `KV_REST_API_URL` and `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL`
   and `UPSTASH_REDIS_REST_TOKEN`, either under a prefix of your choosing, or
   a `REDIS_URL` (as Redis Cloud gives).
2. Add `SUMMIT_ADMIN_KEY`, a long random string: the key for `/summit/admin`,
   where a note can be taken down. Optionally add `SUMMIT_SALT`, any random
   string, used to hash visitors' networks for the daily limits.
3. Redeploy.

`/api/summit` says whether the register is open; when it isn't, `why` says
whether no store was found (`not-configured`) or the one found can't be
reached (`unreachable`).

The limits (note length, notes a day, pulls a day per network) are in
`src/lib/summitRules.js`.

## Assets

| File | What it is |
| --- | --- |
| `public/terrain/height.bin` | 362×362 16-bit heightmap baked from `assets/source/models/snowy_mountain.glb` |
| `public/terrain/snow-mask.webp` | the model's snow/rock erosion mask, used by the snow shader |
| `public/models/prayer_wheel.glb` | meshopt + WebP version of `assets/source/models/prayer_wheel.glb` |
| `public/textures/prayer-flags.webp` | the five lung-ta, fresh and weathered, woodblock-printed (wind horse, mantras, the four dignities); baked by `assets/source/flags/bake-flags.js` |
| `public/images/posters/*.webp` | the summit at dawn, day, sunset and night, rendered from the live scene (loading poster and fallback, picked by the hour) |
| `public/images/poster-hall.webp` | the prayer-wheel hall: the loading poster at `/experience`, and the fallback without WebGL |
| `public/images/projects/*` | project screenshots |
| `src/app/fonts/amita-display.woff2` | the big type: Amita (OFL) with Kurale's capital A, cut down to Latin; see `src/app/fonts/OFL.txt` |
| `src/app/fonts/caveat-latin.woff2` | the handwriting on the summit's board: Caveat (OFL), Latin, weights 400–700 |
| `public/fonts/jomolhari-library.woff2` | Jomolhari (OFL), cut down to the Tibetan numerals, marks and words the site uses |

`assets/source/` keeps the original, uncompressed models and the script that
prints the flags. None of it is deployed.
