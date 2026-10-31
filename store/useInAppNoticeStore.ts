import { create } from "zustand";

export type InAppNotice = {
  id: number;
  title: string;
  body: string;
};

type InAppNoticeState = {
  notice: InAppNotice | null;
  /** Full-screen sheets that would hide the root banner. */
  cover: number;
  show: (input: { title: string; body: string }) => void;
  dismiss: () => void;
  pushCover: () => void;
  popCover: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let lastTitle = "";
let lastAt = 0;
let seq = 0;

function norm(value: string) {
  return value.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export const useInAppNoticeStore = create<InAppNoticeState>((set, get) => ({
  notice: null,
  cover: 0,
  show: (input) => {
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title || !body) return;

    const now = Date.now();
    if (norm(title) === norm(lastTitle) && now - lastAt < 20000) return;
    lastTitle = title;
    lastAt = now;

    if (hideTimer) clearTimeout(hideTimer);
    set({ notice: { id: ++seq, title, body } });
    hideTimer = setTimeout(() => {
      set({ notice: null });
    }, 5200);
  },
  dismiss: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ notice: null });
  },
  pushCover: () => set({ cover: get().cover + 1 }),
  popCover: () => set({ cover: Math.max(0, get().cover - 1) }),
}));

export function showInAppNotice(input: { title: string; body: string }) {
  useInAppNoticeStore.getState().show(input);
}
