import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/store/auth.store";
import type { UsuarioInfoResponse } from "@/types/api.types";

const mockUser: UsuarioInfoResponse = {
  idUsuario: 1,
  nombreCompleto: "Admin Test",
  correoElectronico: "admin@banco.com",
  idIdentificacion: "1234567890",
  telefono: "3001234567",
  fechaNacimiento: "1990-01-01",
  rol: "ADMINISTRADOR",
  estadoUsuario: "Activo",
  fechaCreacion: "2024-01-01T00:00:00Z",
};

describe("auth.store", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("initial state is unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("setUser authenticates the user", () => {
    useAuthStore.getState().setUser(mockUser);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it("clearAuth resets to unauthenticated", () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("isAdmin returns true for ADMINISTRADOR role", () => {
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it("isAdmin returns false for non-admin role", () => {
    useAuthStore.getState().setUser({ ...mockUser, rol: "CLIENTE_PERSONA" });
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it("isSupervisor returns true for ADMINISTRADOR", () => {
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isSupervisor()).toBe(true);
  });

  it("isSupervisor returns true for SUPERVISOR_EMPRESA", () => {
    useAuthStore.getState().setUser({ ...mockUser, rol: "SUPERVISOR_EMPRESA" });
    expect(useAuthStore.getState().isSupervisor()).toBe(true);
  });

  it("isClient returns true for CLIENTE_PERSONA", () => {
    useAuthStore.getState().setUser({ ...mockUser, rol: "CLIENTE_PERSONA" });
    expect(useAuthStore.getState().isClient()).toBe(true);
  });

  it("isClient returns false for ADMINISTRADOR", () => {
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isClient()).toBe(false);
  });

  it("hasRole returns true when user has the role", () => {
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().hasRole("ADMINISTRADOR")).toBe(true);
  });

  it("hasRole returns false when user lacks the role", () => {
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().hasRole("CLIENTE_PERSONA")).toBe(false);
  });

  it("hasRole returns false when not authenticated", () => {
    expect(useAuthStore.getState().hasRole("ADMINISTRADOR")).toBe(false);
  });

  it("setLoading updates isLoading", () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
