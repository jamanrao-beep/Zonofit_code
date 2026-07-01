import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "GYM_OWNER";
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (user, token) => {
    localStorage.setItem("zonofit_portal_token", token);
    localStorage.setItem("zonofit_portal_user", JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("zonofit_portal_token");
    localStorage.removeItem("zonofit_portal_user");
    set({ user: null, token: null });
  },
  initialize: () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const userStr = localStorage.getItem("zonofit_portal_user");
      if (token && userStr) {
        set({ user: JSON.parse(userStr), token });
      }
    } catch (e) {
      // Ignore
    }
  },
}));
