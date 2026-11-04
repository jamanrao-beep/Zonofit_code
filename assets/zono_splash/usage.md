# ZonoFit splash — dev handoff

**Install:** `npm i framer-motion` (v11/12; or `motion` and change the import to `motion/react`).

**Files:** put `ZonoSplash.tsx` + `SplashGate.tsx` in `components/splash/`. Both are client components.

**Font (app/layout.tsx):**
```tsx
import { Plus_Jakarta_Sans } from 'next/font/google';
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-jakarta' });
// <html className={jakarta.variable}> … <body><SplashGate>{children}</SplashGate></body>
```
Or one-off: `<ZonoSplash month={3} onComplete={() => router.replace('/home')} />`

**Props:** `onComplete?()` (fires at 3.70 s when the screen is fully green — navigate here) · `month` (3) · `totalMonths` (12) · `tagline` ('Consistency over perfection') · `wordmark` ('Zonofit') · `className`.

**Timeline** (ms; measured from the 30 fps reference video, all in `SPLASH_TIMELINE`):
| Step | Start | Dur |
|---|---|---|
| Tile fade + scale 0.78→1 | 100 | 330 |
| F top bar wipes in L→R (translucent → solid) | 490 | 90 (solid by 750) |
| F lower hook draws on (faint → solid) | 600 | 110 (solid by 960) |
| Dot drops in + scales | 1100 | 160 |
| Ring ripple around dot (once) | 1300 | 450 |
| "Zonofit" letters rise from a mask (42 ms stagger) | 1740 | 220 each |
| Tagline fades in | 2100 | 300 |
| Segments fill (1 per 100 ms, whole fill capped at 400 ms) | 2580 | 70 each |
| "Month X of 12" fades in | 2950 | 250 |
| Tile pales, F fades | 3270 | 150 |
| Green circle grows out of the dot and floods the screen (#248043) | 3310 | 270 |
| `onComplete()` | 3700 | – |

**Tweak:** edit `SPLASH_TIMELINE` / `SPLASH_COLORS` at the top of the file. Layout uses a 1080×1920 artboard: every size is `u(px)` where `--u = min(100vw,480px)/1080`, so it scales the same on every phone (max 480 px wide, centred vertically).

**Reduced motion:** with `prefers-reduced-motion: reduce` the final logo state shows straight away (no flood) and `onComplete` fires after 900 ms.

**Logo:** the white "F" is hand-traced from the video (viewBox 0 0 422 422 = the tile). If the brand has an official SVG, paste its path data into the two `<path d>` and the `<circle>` in `FMark`. Keep the masks so the draw-on still works.

**Performance:** only transform, opacity and SVG mask pathLength are animated. Opacity and transform run on the GPU through WAAPI. No layout properties change.
