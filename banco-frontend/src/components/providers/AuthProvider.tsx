"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/services/api";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

const PUBLIC_PATHS = ["/login", "/"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, clearAuth, isAuthenticated, setLoading, isLoading } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      const isPublic = PUBLIC_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );

      const hasToken = tokenStorage.getAccessToken();

      if (!hasToken) {
        clearAuth();
        if (!isPublic) {
          router.replace("/login");
        }
        return;
      }

      // Token exists — fetch user profile
      setLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const user = await authService.me();
        clearTimeout(timeout);
        setUser(user);
        if (isPublic && pathname !== "/") {
          router.replace("/dashboard");
        }
      } catch {
        clearAuth();
        tokenStorage.clearTokens();
        if (!isPublic) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Route guard — redirect unauthenticated users
  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    if (!isLoading && !isAuthenticated && !isPublic && initialized.current) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
