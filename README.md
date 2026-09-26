# Tribus game pack

Original browser games built for the Tribus Games portal. Sound and music are synthesized with WebAudio and
every file ships inside the game folder, so nothing is loaded from external servers. Noodle Arena draws all art
in code; Tasty Factory uses CC0 3D models from Kenney.

| Game | Genre | View | Art style | Upload zip |
|---|---|---|---|---|
| [Tasty Factory](store/tasty-factory/README.md) | Idle / incremental tycoon | 3D | Kenney CC0 low-poly kits, warm pastel factory | `dist/tasty-factory.zip` (~1.2 MB) |
| [Noodle Arena](store/noodle-arena/README.md) | Snake .io arena | 2D | Gouache paint on warm paper | `dist/noodle-arena.zip` |

### Tasty Factory
Ten production lines (cookies → party cakes) that visibly grow as they level up (robot arms, scanners, striped
belts, cogs), animated managers, workers and a delivery truck. Systems: tap-to-bake, level milestones (speed ×2),
managers (automation + offline earnings), 66 profit upgrades, golden crates and sugar frenzy, a goal chain with
rewards, prestige (Chef Stars, +2% each) with star perks, and optional rewarded boosts (Rush ×2, Time warp,
Crate of parts, Welcome back ×2). Source lives in `src/tasty-factory/` and is bundled with esbuild:

```
npm i three@0.186 esbuild playwright-core   # once
tools/tf-build.sh                  # bundle src/tasty-factory -> games/tasty-factory/game.js and dist zip
node tools/tf-sim.mjs 120 75       # pacing simulation (minutes, prestige at minute 75)
node tools/tf-flows.mjs            # prestige, boosts, offline earnings, reset checks
node tools/tf-play.mjs 390x780 6   # click-driven playtest bot
node tools/tf-cover.mjs            # store covers
```
Assets: Kenney Factory/Food/Mini Characters/Mini Market/Car kits and Game Icons (CC0), fonts Lilita One and
Nunito (SIL OFL) — see `games/tasty-factory/licenses/`. The build embeds every model, texture, icon and font into
`index.html`/`game.js`, so the game also runs when `index.html` is opened directly from disk (file://).
Source assets live in `src/tasty-factory/assets/`.

The 39 earlier prototypes did not reach the quality bar and were moved to `descartados/`
(`descartados/games`, `descartados/store`, `descartados/dist`). They are kept for reference only and
should not be uploaded.

Each `store/<game>/` folder has the store description, the "How to play" text (EN + PT) and
16:9 (1280×720) and square covers captured from real gameplay.

## Portal requirements checklist

- **Size / load:** Noodle Arena ~35 KB zipped, Tasty Factory ~1.2 MB zipped (three.js bundled, 75 small glTF models). Everything loads in well under a second locally.
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
                     DOM UI, 2D game-feel (particles, floating text, shake, hit-stop, tweens) and
                     standard screens (menu, end-of-round with revive/x2/x3, shop, upgrades, level grid)
shared/three.min.js  three.js r186 bundled as a local script (3D games only)
games/<slug>/        upload-ready folder: index.html, game.js, lib/ (copies of the shared files)
dist/<slug>.zip      zip of each game folder, ready to upload
store/<slug>/        store text + covers
tools/               sync/zip script, smoke test, long-play test, cover capture, mkhtml.py page generator
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
