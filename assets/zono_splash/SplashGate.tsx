'use client';

/**
 * SplashGate — shows <ZonoSplash/> once per browser session, then renders
 * the app. Children are mounted underneath from the start (no layout shift),
 * the splash overlay is removed when it calls onComplete.
 */
import { useEffect, useState, type ReactNode } from 'react';
import ZonoSplash, { type ZonoSplashProps } from './ZonoSplash';

const KEY = 'zonofit:splash-seen';

export default function SplashGate({
  children,
  ...splashProps
}: { children: ReactNode } & Omit<ZonoSplashProps, 'onComplete'>) {
  // null = not decided yet (SSR / first paint) → render a white cover to avoid a flash.
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    setShow(sessionStorage.getItem(KEY) !== '1');
  }, []);

  const finish = () => {
    sessionStorage.setItem(KEY, '1');
    setShow(false);
  };

  return (
    <>
      {children}
      {show === null && <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 9999 }} />}
      {show && <ZonoSplash {...splashProps} onComplete={finish} />}
    </>
  );
}
