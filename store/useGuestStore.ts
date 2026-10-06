import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const GUEST_STORAGE_KEY = "zonofit_guest_session";
// 48 hours guest duration per PRD Section 4.1
export const GUEST_DURATION_MS = 48 * 60 * 60 * 1000;

export interface GuestSession {
  sessionId: string;
  startTime: number;
  expiryTime: number;
  status: "ACTIVE" | "EXPIRED" | "CONVERTED";
  selectedGymId: string | null;
  selectedGymName: string | null;
}

interface GuestState {
  isGuest: boolean;
  session: GuestSession | null;
  hoursRemaining: number;
  isExpired: boolean;
  selectedGymId: string | null;
  selectedGymName: string | null;

  // Actions
  initializeGuest: () => Promise<{ isGuest: boolean; isExpired: boolean }>;
  startGuestSession: () => Promise<void>;
  selectGym: (gymId: string, gymName?: string) => Promise<void>;
  convertGuest: () => Promise<void>;
  clearGuestSession: () => Promise<void>;
  endGuestSession: () => Promise<void>;
  checkExpiry: () => boolean;
  getHoursRemaining: () => number;
}

export const useGuestStore = create<GuestState>((set, get) => ({
  isGuest: false,
  session: null,
  hoursRemaining: 48,
  isExpired: false,
  selectedGymId: null,
  selectedGymName: null,

  initializeGuest: async () => {
    try {
      const stored = await SecureStore.getItemAsync(GUEST_STORAGE_KEY);
      if (!stored) {
        set({ isGuest: false, session: null, isExpired: false });
        return { isGuest: false, isExpired: false };
      }

      const session: GuestSession = JSON.parse(stored);
      const now = Date.now();
      const isExpired = now >= session.expiryTime || session.status === "EXPIRED";

      if (isExpired) {
        session.status = "EXPIRED";
        await SecureStore.setItemAsync(GUEST_STORAGE_KEY, JSON.stringify(session));
        set({
          isGuest: true,
          session,
          isExpired: true,
          hoursRemaining: 0,
          selectedGymId: session.selectedGymId,
          selectedGymName: session.selectedGymName,
        });
        return { isGuest: true, isExpired: true };
      }

      const diffMs = session.expiryTime - now;
      const hoursRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

      set({
        isGuest: session.status === "ACTIVE",
        session,
        isExpired: false,
        hoursRemaining,
        selectedGymId: session.selectedGymId,
        selectedGymName: session.selectedGymName,
      });

      return { isGuest: session.status === "ACTIVE", isExpired: false };
    } catch (e) {
      set({ isGuest: false, session: null, isExpired: false });
      return { isGuest: false, isExpired: false };
    }
  },

  startGuestSession: async () => {
    const now = Date.now();
    const expiryTime = now + GUEST_DURATION_MS;
    const session: GuestSession = {
      sessionId: `guest_${now}_${Math.random().toString(36).substring(2, 9)}`,
      startTime: now,
      expiryTime,
      status: "ACTIVE",
      selectedGymId: null,
      selectedGymName: null,
    };

    await SecureStore.setItemAsync(GUEST_STORAGE_KEY, JSON.stringify(session));
    set({
      isGuest: true,
      session,
      isExpired: false,
      hoursRemaining: 48,
      selectedGymId: null,
      selectedGymName: null,
    });
  },

  selectGym: async (gymId: string, gymName?: string) => {
    const { session } = get();
    if (session) {
      const updated: GuestSession = {
        ...session,
        selectedGymId: gymId,
        selectedGymName: gymName || null,
      };
      await SecureStore.setItemAsync(GUEST_STORAGE_KEY, JSON.stringify(updated));
      set({
        session: updated,
        selectedGymId: gymId,
        selectedGymName: gymName || null,
      });
    } else {
      set({
        selectedGymId: gymId,
        selectedGymName: gymName || null,
      });
    }

    try {
      const { useUserStore } = require("./useUserStore");
      useUserStore.getState().setPrimaryGym(gymId, gymName || "FitZone Pro");
    } catch {}
  },

  convertGuest: async () => {
    const { session } = get();
    if (session) {
      const updated: GuestSession = {
        ...session,
        status: "CONVERTED",
      };
      await SecureStore.setItemAsync(GUEST_STORAGE_KEY, JSON.stringify(updated));
    }
    set({ isGuest: false, session: null, isExpired: false });
  },

  clearGuestSession: async () => {
    await SecureStore.deleteItemAsync(GUEST_STORAGE_KEY);
    set({
      isGuest: false,
      session: null,
      isExpired: false,
      hoursRemaining: 0,
      selectedGymId: null,
      selectedGymName: null,
    });
  },

  endGuestSession: async () => {
    await SecureStore.deleteItemAsync(GUEST_STORAGE_KEY);
    set({
      isGuest: false,
      session: null,
      isExpired: false,
      hoursRemaining: 0,
      selectedGymId: null,
      selectedGymName: null,
    });
  },

  getHoursRemaining: () => {
    const { session } = get();
    if (!session) return 0;
    const now = Date.now();
    if (now >= session.expiryTime) return 0;
    const diffMs = session.expiryTime - now;
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  },

  checkExpiry: () => {
    const { session } = get();
    if (!session) return false;
    const isExp = Date.now() >= session.expiryTime;
    if (isExp && !get().isExpired) {
      set({ isExpired: true, hoursRemaining: 0 });
    }
    return isExp;
  },
}));
