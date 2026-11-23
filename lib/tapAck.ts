import { afterPaint } from "@/lib/afterPaint";

type Hold = "route" | "work";

type TapWait = {
  active: boolean;
  title: string;
  patient: boolean;
  hold: Hold | null;
};

const PATIENT_MS = 650;
const ROUTE_GIVE_UP_MS = 10000;
const WORK_GIVE_UP_MS = 20000;

let snapshot: TapWait = { active: false, title: "", patient: false, hold: null };
let generation = 0;
let onEnd: (() => void) | null = null;
let patientTimer: ReturnType<typeof setTimeout> | null = null;
let stuckTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getTapWait() {
  return snapshot;
}

export function subscribeTapWait(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clearTimers() {
  if (patientTimer) clearTimeout(patientTimer);
  if (stuckTimer) clearTimeout(stuckTimer);
  patientTimer = null;
  stuckTimer = null;
}

export function endTap(token?: number) {
  if (token != null && token !== generation) return;
  generation += 1;
  clearTimers();
  const done = onEnd;
  onEnd = null;
  snapshot = { active: false, title: "", patient: false, hold: null };
  emit();
  done?.();
}

function begin(title: string, hold: Hold, giveUpMs: number, done?: () => void) {
  if (snapshot.active) return 0;
  const token = ++generation;
  onEnd = done ?? null;
  snapshot = { active: true, title, patient: false, hold };
  emit();
  patientTimer = setTimeout(() => {
    if (token !== generation) return;
    snapshot = { ...snapshot, patient: true };
    emit();
  }, PATIENT_MS);
  stuckTimer = setTimeout(() => endTap(token), giveUpMs);
  return token;
}

/** Show feedback, paint it, then navigate. The screen stays up until the route changes. */
export function ackRoute(title: string, action: () => void, done?: () => void) {
  const token = begin(title, "route", ROUTE_GIVE_UP_MS, done);
  if (!token) return false;
  afterPaint(() => {
    if (token !== generation) return;
    try {
      action();
    } catch {
      endTap(token);
    }
  });
  return true;
}

/** Show feedback, paint it, then run the request. The screen stays up until the work finishes. */
export function ackWork(title: string, action: () => void | Promise<void>, done?: () => void) {
  const token = begin(title, "work", WORK_GIVE_UP_MS, done);
  if (!token) return false;
  afterPaint(() => {
    if (token !== generation) return;
    Promise.resolve()
      .then(action)
      .catch(() => {})
      .finally(() => endTap(token));
  });
  return true;
}

type BackRouter = {
  back: () => void;
  canGoBack?: () => boolean;
  replace?: (href: any) => void;
};

export function ackBack(router: BackRouter, fallback?: string) {
  return ackRoute("Going back…", () => {
    const can = router.canGoBack ? router.canGoBack() : true;
    if (!can) {
      if (fallback && router.replace) router.replace(fallback);
      else endTap();
      return;
    }
    router.back();
  });
}

type PushRouter = { push: (href: any) => void };
type ReplaceRouter = { replace: (href: any) => void };

export function ackPush(router: PushRouter, href: any, title = "Opening…") {
  return ackRoute(title, () => router.push(href));
}

export function ackReplace(router: ReplaceRouter, href: any, title = "Opening…") {
  return ackRoute(title, () => router.replace(href));
}
