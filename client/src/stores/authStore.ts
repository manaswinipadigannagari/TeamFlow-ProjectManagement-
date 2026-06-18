import { create } from "zustand";
import { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setCredentials: (user: User, accessToken: string) => void;
  clearCredentials: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setCredentials: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
    }),
  clearCredentials: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    }),
}));
