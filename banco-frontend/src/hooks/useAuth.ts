import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/services/api";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { UserRole } from "@/types/api.types";

/**
 * Convenience hook that wraps the auth store with action helpers.
 */
export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();

  const logout = useCallback(async () => {
    await authService.logout();
    store.clearAuth();
    router.replace("/login");
  }, [store, router]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authService.me();
      store.setUser(user);
      return user;
    } catch {
      store.clearAuth();
      tokenStorage.clearTokens();
      router.replace("/login");
      return null;
    }
  }, [store, router]);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    logout,
    refreshUser,
    hasRole: store.hasRole,
    isAdmin: store.isAdmin,
    isSupervisor: store.isSupervisor,
    isAnalyst: store.isAnalyst,
    isEmployee: store.isEmployee,
    isClient: store.isClient,
  };
}

/**
 * Returns true if the current user has at least one of the given roles.
 */
export function useHasRole(...roles: UserRole[]): boolean {
  const { user } = useAuthStore();
  if (!user) return false;
  return roles.includes(user.rol);
}
