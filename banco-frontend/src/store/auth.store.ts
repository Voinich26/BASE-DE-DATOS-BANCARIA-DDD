import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UsuarioInfoResponse, UserRole } from "@/types/api.types";

interface AuthState {
  user: UsuarioInfoResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: UsuarioInfoResponse) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;

  // Helpers
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isSupervisor: () => boolean;
  isAnalyst: () => boolean;
  isEmployee: () => boolean;
  isClient: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      clearAuth: () => set({ user: null, isAuthenticated: false }),

      setLoading: (isLoading) => set({ isLoading }),

      hasRole: (...roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.rol);
      },

      isAdmin: () => {
        const { user } = get();
        return user?.rol === "ADMINISTRADOR";
      },

      isSupervisor: () => {
        const { user } = get();
        if (!user) return false;
        return ["ADMINISTRADOR", "SUPERVISOR_EMPRESA"].includes(user.rol);
      },

      isAnalyst: () => {
        const { user } = get();
        if (!user) return false;
        return ["ADMINISTRADOR", "ANALISTA_INTERNO"].includes(user.rol);
      },

      isEmployee: () => {
        const { user } = get();
        if (!user) return false;
        return [
          "ADMINISTRADOR",
          "SUPERVISOR_EMPRESA",
          "ANALISTA_INTERNO",
          "EMPLEADO_VENTANILLA",
          "EMPLEADO_COMERCIAL",
        ].includes(user.rol);
      },

      isClient: () => {
        const { user } = get();
        if (!user) return false;
        return [
          "CLIENTE_EMPRESA",
          "CLIENTE_PERSONA",
          "CLIENTE_PERSONA_NATURAL",
        ].includes(user.rol);
      },
    }),
    {
      name: "banco-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
