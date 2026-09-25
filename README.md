# Tribus game pack — 10 HTML5 games

Ten original browser games inspired by the most played web-game genres, built for the Tribus Games portal.
All art is drawn in code (canvas / three.js primitives), all sound and music are synthesized with WebAudio,
so there are **no third-party assets** and nothing is loaded from external servers.

| Game | Genre (inspiration) | View | Art style | Upload zip |
|---|---|---|---|---|
| [Bakery Empire](store/bakery-empire/README.md) | Idle clicker | 2D | Risograph print (3 inks, misregistration, grain) | `dist/bakery-empire.zip` |
| [Azulejo 2048](store/azulejo-2048/README.md) | 2048 merge puzzle | 2D | Hand-painted Portuguese ceramic tiles | `dist/azulejo-2048.zip` |
| [Noodle Arena](store/noodle-arena/README.md) | Snake .io arena | 2D | Gouache paint on warm paper | `dist/noodle-arena.zip` |
| [Crayon Lands](store/crayon-lands/README.md) | Territory capture .io | 2D | Wax crayon on a sketchbook | `dist/crayon-lands.zip` |
| [Garden Siege](store/garden-siege/README.md) | Tower defense | 2D | Layered cut paper | `dist/garden-siege.zip` |
| [Ink Swing](store/ink-swing/README.md) | Grapple swing platformer | 2D | Pen ink + one accent color | `dist/ink-swing.zip` |
| [Lantern Night](store/lantern-night/README.md) | Survivor roguelite | 2D | Silhouettes lit by a warm lantern | `dist/lantern-night.zip` |
| [Neon Descent](store/neon-descent/README.md) | Endless slope | 3D | Synthwave neon | `dist/neon-descent.zip` |
| [Rooftop Rush](store/rooftop-rush/README.md) | 3-lane endless runner | 3D | Low-poly toy town | `dist/rooftop-rush.zip` |
| [Hop Street](store/hop-street/README.md) | Road crosser | 3D | Voxel | `dist/hop-street.zip` |

Each `store/<game>/` folder has the store description, the "How to play" text (EN + PT) and
16:9 (1280×720) and square covers captured from real gameplay.

## Portal requirements checklist

- **Size / load:** 2D games are ~100 KB zipped, 3D games ~250 KB zipped (three.js is bundled locally). Everything loads in well under a second locally.
- **Two clicks to play:** the first screen has a big **Play** button; one click starts a round.
- **No scrollbars, adapts to any frame size and fullscreen:** full-window canvas, resized on `resize`/`fullscreenchange`; portrait layouts on mobile.
- **Touch controls** in every game (swipe, drag joystick, hold zones or on-screen buttons).
- **No console errors:** checked with `tools/test.mjs` (desktop + mobile viewport) on every game.
- **No pop-ups, external links or personal data.**
- **Progress is saved** through `TribusSDK.data` (cloud save) with a local fallback outside the portal.
- **Audio stops** when the tab is hidden, on the SDK `pause` event and while any ad plays.
- **Ads use only the Tribus SDK:**
  - `midgame` is requested only after a game over / level end when the player presses *Play again* / *Next*, and the kit enforces a ≥2 min gap (the portal also rejects `too_frequent`; the game continues on any error).
  - `rewarded` only from buttons marked with the ▶ video icon, always optional, reward given only when the promise resolves (revive, x2/x3 coins, boosts, free spins, rerolls…). Closing early gives no reward and shows a short message.
- **Content:** all ages, no violence beyond cartoon "pop", no gambling with real money (the wheel and prize machine only use in-game coins).
- **Made with AI:** yes — turn on the "Made with AI" flag when uploading. All code and generated art are original to this repo.

## How it is organized

```
shared/kit.js        runtime shared by all games: SDK wrapper, save, audio synth, music sequencer,
                     meta economy (daily reward, lucky wheel, free gift, missions, level/XP, chests),
                     DOM UI and 2D game-feel (particles, floating text, shake, hit-stop, tweens)
shared/three.min.js  three.js r186 bundled as a local script (3D games only)
games/<slug>/        upload-ready folder: index.html, game.js, lib/ (copies of the shared files)
dist/<slug>.zip      zip of each game folder, ready to upload
store/<slug>/        store text + covers
tools/               sync/zip script, smoke test, long-play test, cover capture
```

After editing `shared/kit.js`, run `tools/sync.sh` to copy it into every game and rebuild the zips.

### SDK

Games uploaded to Tribus get the SDK injected automatically, so the HTML files do not include the
`<script src="https://<portal-domain>/sdk/v1/tribus-sdk.js">` tag (the portal domain is not known here, and a
broken URL would cause a console error). `kit.js` uses `window.TribusSDK` when present; otherwise it runs a local
stand-in that shows a 2-second test ad. If your upload flow does **not** inject the SDK, add the script tag
in `<head>` before `lib/kit.js`.

### Testing

```
npm i playwright-core            # once, in tools/ or anywhere on NODE_PATH
node tools/test.mjs              # smoke test all games (desktop + mobile), fails on console errors
node tools/deep.mjs <slug> 30 ArrowUp Space   # 30 s of random play for one game
node tools/covers.mjs [slug]     # regenerate covers
```
