'use client';

/**
 * ZonoSplash — ZonoFit launch splash (logo build → wordmark → tagline →
 * "Month X of 12" progress → green circle flood → onComplete).
 *
 * Recreated frame-by-frame from the 1080×1920 / 30 fps reference video.
 * All geometry is authored on a 1080-px-wide artboard and scaled with the
 * CSS unit `--u` (= 1/1080 of the container width, container ≤ 480 px), so it
 * looks identical on every phone. Only transform / opacity / pathLength are
 * animated (GPU-friendly, no layout shift).
 */

import { motion, useReducedMotion, type Easing, type Transition } from 'framer-motion';
import { useEffect, useId, useRef, type CSSProperties } from 'react';

/* ------------------------------------------------------------------------ */
/* Timeline (ms from mount) — measured from the reference video @30 fps.     */
/* ------------------------------------------------------------------------ */
export const SPLASH_TIMELINE = {
  tileIn: { start: 100, duration: 330 }, // tile fades in + scales 0.78 → 1
  barWipe: { start: 490, duration: 90 }, // F top bar wipes in L → R
  barSolid: { start: 490, duration: 260 }, // …translucent → solid
  hookDraw: { start: 600, duration: 110 }, // F lower hook draws on
  hookSolid: { start: 600, duration: 360 }, // ease-in: stays faint, then snaps solid ~0.85 s
  dotIn: { start: 1100, duration: 160 }, // dot drops in + scales up
  ringPulse: { start: 1300, duration: 450 }, // single ring ripple from the dot
  wordmarkIn: { start: 1740, duration: 220, stagger: 42 }, // letters rise from a mask, L → R
  taglineIn: { start: 2100, duration: 300 }, // tagline fades in
  segmentsIn: { start: 2580, step: 100, maxWindow: 400, duration: 70 }, // fills
  labelIn: { start: 2950, duration: 250 }, // "Month X of 12" fades in
  tileOut: { start: 3270, duration: 150 }, // tile pales, F fades out
  flood: { start: 3310, duration: 270 }, // green circle grows out of the dot and floods the screen
  complete: 3700, // onComplete() fires (green held ~120 ms)
} as const;

/** Colours sampled from the video (sRGB). */
export const SPLASH_COLORS = {
  bg: '#ffffff',
  tileTop: '#8fbc30',
  tileBottom: '#4a8a33',
  mark: '#ffffff',
  wordmark: '#1b2b20',
  tagline: '#6b7470',
  label: '#6b7470',
  trackEmpty: '#dbe3d7',
  segFrom: '#8dbb2f', // filled segment gradient (left → right)
  segTo: '#4d9134',
  flood: '#248043',
} as const;

export interface ZonoSplashProps {
  /** Called once the green flood covers the screen — navigate here. */
  onComplete?: () => void;
  /** Current month shown in the bar / label. Default 3. */
  month?: number;
  /** Total months (segments). Default 12. */
  totalMonths?: number;
  tagline?: string;
  wordmark?: string;
  className?: string;
}

const s = (ms: number) => ms / 1000;
const EASE_OUT: Easing = [0.22, 1, 0.36, 1];
const at = (ms: { start: number; duration: number }, ease: Easing = EASE_OUT): Transition => ({
  delay: s(ms.start),
  duration: s(ms.duration),
  ease,
});

/** px on the 1080-wide artboard → responsive CSS length. */
const u = (px: number) => `calc(${px} * var(--u))`;

export default function ZonoSplash({
  onComplete,
  month = 3,
  totalMonths = 12,
  tagline = 'Consistency over perfection',
  wordmark = 'Zonofit',
  className,
}: ZonoSplashProps) {
  const reduce = useReducedMotion() ?? false;
  const T = SPLASH_TIMELINE;
  const C = SPLASH_COLORS;
  const done = useRef(onComplete);
  done.current = onComplete;

  // Fire onComplete once (shortened when reduced motion is on).
  useEffect(() => {
    const id = window.setTimeout(() => done.current?.(), reduce ? 900 : T.complete);
    return () => window.clearTimeout(id);
  }, [reduce, T.complete]);

  /** In reduced-motion mode every element starts at its final state. */
  const tr = (t: Transition): Transition => (reduce ? { duration: 0 } : t);
  const filled = Math.max(0, Math.min(month, totalMonths));
  const step = Math.min(T.segmentsIn.step, T.segmentsIn.maxWindow / Math.max(filled, 1));

  const root: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    overflow: 'hidden',
    background: C.bg,
    fontFamily: 'var(--font-jakarta, "Plus Jakarta Sans"), system-ui, -apple-system, "Segoe UI", sans-serif',
    ['--u' as string]: 'calc(min(100vw, 480px) / 1080)',
  };

  const board: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: u(1080),
    height: u(1920),
    transform: 'translate(-50%, -50%)',
  };
  const centerX: CSSProperties = { position: 'absolute', left: 0, right: 0, textAlign: 'center' };

  return (
    <div className={className} style={root} role="status" aria-label={`${wordmark} — loading`}>
      <div style={board}>
        {/* ---------- App-icon tile ---------- */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.78 }}
          animate={reduce ? undefined : { opacity: [0, 1, 1, 0.55], scale: [0.78, 1, 1, 1] }}
          transition={tr({
            duration: s(T.tileOut.start + T.tileOut.duration - T.tileIn.start),
            delay: s(T.tileIn.start),
            times: [
              0,
              T.tileIn.duration / (T.tileOut.start + T.tileOut.duration - T.tileIn.start),
              (T.tileOut.start - T.tileIn.start) / (T.tileOut.start + T.tileOut.duration - T.tileIn.start),
              1,
            ],
            ease: [EASE_OUT, 'linear', 'easeIn'],
          })}
          style={{
            position: 'absolute',
            left: u(330),
            top: u(546),
            width: u(422),
            height: u(422),
            borderRadius: u(100),
            background: `linear-gradient(180deg, ${C.tileTop} 0%, ${C.tileBottom} 100%)`,
            boxShadow: `0 ${u(16)} ${u(40)} rgba(74,138,51,0.22)`,
            willChange: 'transform, opacity',
          }}
        >
          <FMark reduce={reduce} tr={tr} />
        </motion.div>

        {/* ---------- Wordmark: letters rise out of a clip box, staggered ---------- */}
        <div style={{ ...centerX, top: u(1022), height: u(118), overflow: 'hidden' }}>
          <div
            aria-label={wordmark}
            style={{
              fontSize: u(93),
              lineHeight: u(118),
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: C.wordmark,
              whiteSpace: 'pre',
            }}
          >
            {Array.from(wordmark).map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={reduce ? false : { y: '100%', opacity: 0.2 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={tr({
                  delay: s(T.wordmarkIn.start + i * T.wordmarkIn.stagger),
                  duration: s(T.wordmarkIn.duration),
                  ease: EASE_OUT,
                })}
                style={{ display: 'inline-block', willChange: 'transform, opacity' }}
              >
                {ch}
              </motion.span>
            ))}
          </div>
        </div>

        {/* ---------- Tagline ---------- */}
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={tr(at(T.taglineIn, 'easeOut'))}
          style={{ ...centerX, margin: 0, top: u(1165), fontSize: u(44), lineHeight: u(56), fontWeight: 500, letterSpacing: '0.01em', color: C.tagline }}
        >
          {tagline}
        </motion.p>

        {/* ---------- 12-segment progress (track visible from frame 0) ---------- */}
        <div
          aria-hidden
          style={{ position: 'absolute', top: u(1284), left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: u(14) }}
        >
          {Array.from({ length: totalMonths }, (_, i) => (
            <div key={i} style={{ position: 'relative', width: u(46), height: u(17), borderRadius: u(9), background: C.trackEmpty, overflow: 'hidden' }}>
              {i < filled && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={tr({ delay: s(T.segmentsIn.start + i * step), duration: s(T.segmentsIn.duration), ease: EASE_OUT })}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transformOrigin: 'left center',
                    background: `linear-gradient(90deg, ${C.segFrom}, ${C.segTo})`,
                    willChange: 'transform, opacity',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ---------- "Month X of N" ---------- */}
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={tr(at(T.labelIn, 'easeOut'))}
          style={{ ...centerX, margin: 0, top: u(1320), fontSize: u(38), lineHeight: u(50), fontWeight: 700, color: C.label }}
        >
          Month {filled} of {totalMonths}
        </motion.p>
      </div>

      {/* ---------- Green circle flood (from tile centre) ---------- */}
      {!reduce && (
        <motion.div
          aria-hidden
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0.007, 0.02, 0.04, 0.09, 0.16, 0.5, 1], opacity: 1 }}
          transition={{
            scale: { ...at(T.flood, 'linear'), times: [0, 0.25, 0.43, 0.6, 0.75, 0.9, 1] },
            opacity: { delay: s(T.flood.start), duration: 0.001 },
          }}
          style={{
            position: 'absolute',
            top: `calc(50% + ${u(824 - 960)})`,
            left: `calc(50% + ${u(525 - 540)})`,
            width: '300vmax',
            height: '300vmax',
            marginLeft: '-150vmax',
            marginTop: '-150vmax',
            borderRadius: '50%',
            background: C.flood,
            willChange: 'transform',
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* The white "F" mark                                                       */
/* ------------------------------------------------------------------------ */
function FMark({ reduce, tr }: { reduce: boolean; tr: (t: Transition) => Transition }) {
  const T = SPLASH_TIMELINE;
  const id = useId().replace(/:/g, '');
  const fadeOut = { delay: s(T.tileOut.start), duration: s(T.tileOut.duration), ease: 'easeIn' as const };

  return (
    <motion.svg
      viewBox="0 0 422 422"
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      initial={{ opacity: 1 }}
      animate={reduce ? undefined : { opacity: 0 }}
      transition={fadeOut}
      aria-hidden
    >
      <defs>
        {/* top bar: rect wipes left → right */}
        <mask id={`${id}-bar`} maskUnits="userSpaceOnUse" x="0" y="0" width="422" height="422">
          <motion.rect
            x="90" y="105" width="245" height="56" fill="#fff"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={tr(at(T.barWipe))}
            style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
          />
        </mask>
        {/* hook: thick centre-line stroke draws on */}
        <mask id={`${id}-hook`} maskUnits="userSpaceOnUse" x="0" y="0" width="422" height="422">
          <motion.path
            d="M302 195 H202 C166 196 148 222 146 256 L146 262"
            fill="none" stroke="#fff" strokeWidth="48" strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={tr(at(T.hookDraw, 'easeInOut'))}
          />
        </mask>
      </defs>

      {/* Top bar */}
      <motion.path
        mask={`url(#${id}-bar)`}
        fill="#fff"
        d="M120 114 H321 Q331 114 325 122 L305 147 Q300 153 292 153 H106 Q94 153 97 142 L104 124 Q108 114 120 114 Z"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={tr(at(T.barSolid, 'easeOut'))}
      />
      {/* Lower hook */}
      <motion.path
        mask={`url(#${id}-hook)`}
        fill="#fff"
        d="M202 176 H288 Q297 176 291 184 L267 210 Q262 215 255 215 H197 Q174 216 167 240 L164 258 Q161 274 146 274 Q128 274 128 256 L130 240 Q135 206 160 189 Q178 176 202 176 Z"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={tr(at(T.hookSolid, [0.7, 0, 0.84, 0.4]))}
      />
      {/* Dot */}
      <motion.circle
        cx="193" cy="278" r="19.5" fill="#fff"
        initial={reduce ? false : { opacity: 0, scale: 0.5, y: -34 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={tr(at(T.dotIn))}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      {/* Ring ripple */}
      {!reduce && (
        <motion.circle
          cx="193" cy="278" r="22" fill="none" stroke="#fff" strokeWidth="4"
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.75, 0], scale: [1, 1.5, 2.1] }}
          transition={{ ...at(T.ringPulse, 'easeOut'), times: [0, 0.25, 1] }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      )}
    </motion.svg>
  );
}
