'use client';

/**
 * Opening splash. The green tile pops in, the mark slides together, a shine
 * crosses it, then the name and tagline rise. It leaves after 3.7s.
 */

import { Poppins } from 'next/font/google';
import { useEffect, useId, useRef } from 'react';
import './zono-splash.css';

const poppins = Poppins({ weight: '500', subsets: ['latin'], display: 'swap' });

const HOLD_MS = 3700;

export interface ZonoSplashProps {
  onComplete?: () => void;
  tagline?: string;
  wordmark?: string;
  className?: string;
}

export default function ZonoSplash({
  onComplete,
  tagline = 'Consistency over perfection',
  wordmark = 'Zonofit',
  className,
}: ZonoSplashProps) {
  const done = useRef(onComplete);
  done.current = onComplete;
  const uid = useId().replace(/:/g, '');
  const tile = `zf-tile-${uid}`;
  const shine = `zf-shine-${uid}`;
  const clip = `zf-clip-${uid}`;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => done.current?.(), reduced ? 700 : HOLD_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className={`zf-splash ${poppins.className}${className ? ` ${className}` : ''}`} role="status" aria-label={`${wordmark} — loading`}>
      <div className="zf-splash-group">
        <div className="zf-splash-icon">
          <svg viewBox="0 0 1017 1018" role="img" aria-label="Zonofit logo">
            <defs>
              <linearGradient id={tile} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#92bb2a" />
                <stop offset="1" stopColor="#33782d" />
              </linearGradient>
              <clipPath id={clip}>
                <rect width="1017" height="1018" rx="250" />
              </clipPath>
              <linearGradient id={shine} x1="0" x2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.3" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g clipPath={`url(#${clip})`}>
              <rect width="1017" height="1018" fill={`url(#${tile})`} />
              <path className="bar" d="M230,374 L232,377 L684,377 L685,376 L695,376 L713,372 L726,367 L737,361 L753,349 L765,336 L774,322 L782,303 L785,286 L784,285 L314,285 L305,286 L289,290 L270,299 L258,308 L248,318 L240,330 L232,350 L230,361Z" fill="#fff" />
              <path className="hook" d="M708,438 L538,438 L537,439 L536,438 L535,439 L534,438 L533,439 L532,438 L531,439 L530,438 L529,439 L528,438 L527,439 L526,438 L525,439 L524,438 L515,439 L514,438 L513,439 L496,439 L461,445 L444,450 L420,460 L402,470 L372,492 L345,521 L331,542 L316,573 L309,595 L305,614 L304,629 L307,641 L311,649 L324,662 L340,669 L360,669 L369,666 L379,660 L387,653 L396,637 L399,618 L404,602 L413,584 L420,574 L437,557 L446,550 L472,537 L490,532 L504,530 L609,530 L619,529 L642,523 L659,515 L673,505 L687,491 L694,481 L704,461Z" fill="#f4f4f4" />
              <path className="dot" d="M460,632 L450,634 L439,639 L430,646 L424,653 L419,662 L416,672 L416,689 L418,697 L424,709 L436,721 L443,725 L455,729 L473,729 L483,726 L492,721 L504,709 L509,700 L512,691 L513,682 L512,671 L506,656 L502,650 L492,641 L475,633 L467,632 L461,633Z" fill="#fff" />
              <rect className="shine" x="0" y="-100" width="260" height="1300" fill={`url(#${shine})`} />
            </g>
          </svg>
        </div>
        <div className="zf-splash-name">{wordmark}</div>
        <div className="zf-splash-tag">{tagline}</div>
      </div>
    </div>
  );
}
