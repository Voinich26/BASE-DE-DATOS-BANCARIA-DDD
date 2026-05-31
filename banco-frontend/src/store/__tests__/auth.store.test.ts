import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../auth.store";
import type { UsuarioInfoResponse, UserRole, UserStatus } from "@/types/api.types";

describe("AuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it("should initialize with default state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("should set user on login", () => {
    const mockUser: UsuarioInfoResponse = { 
      idUsuario: 1, 
      nombreCompleto: "John Doe", 
      correoElectronico: "john@example.com",
      idIdentificacion: "123456",
      telefono: "1234567890",
      fechaNacimiento: "1990-01-01",
      rol: "ADMINISTRADOR" as UserRole,
      estadoUsuario: "ACTIVO" as UserStatus,
      fechaCreacion: "2024-01-01",
    };
    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it("should clear user on logout", () => {
    const mockUser: UsuarioInfoResponse = { 
      idUsuario: 1, 
      nombreCompleto: "John Doe", 
      correoElectronico: "john@example.com",
      idIdentificacion: "123456",
      telefono: "1234567890",
      fechaNacimiento: "1990-01-01",
      rol: "ADMINISTRADOR" as UserRole,
      estadoUsuario: "ACTIVO" as UserStatus,
      fechaCreacion: "2024-01-01",
    };
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should set loading state", () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("should check if user has role", () => {
    const mockUser: UsuarioInfoResponse = { 
      idUsuario: 1, 
      nombreCompleto: "John Doe", 
      correoElectronico: "john@example.com",
      idIdentificacion: "123456",
      telefono: "1234567890",
      fechaNacimiento: "1990-01-01",
      rol: "ADMINISTRADOR" as UserRole,
      estadoUsuario: "ACTIVO" as UserStatus,
      fechaCreacion: "2024-01-01",
    };
    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.hasRole("ADMINISTRADOR" as UserRole)).toBe(true);
    expect(state.hasRole("CLIENTE_EMPRESA" as UserRole)).toBe(false);
  });

  it("should check if user is admin", () => {
    const mockUser: UsuarioInfoResponse = { 
      idUsuario: 1, 
      nombreCompleto: "John Doe", 
      correoElectronico: "john@example.com",
      idIdentificacion: "123456",
      telefono: "1234567890",
      fechaNacimiento: "1990-01-01",
      rol: "ADMINISTRADOR" as UserRole,
      estadoUsuario: "ACTIVO" as UserStatus,
      fechaCreacion: "2024-01-01",
    };
    useAuthStore.getState().setUser(mockUser);

    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it("should check if user is supervisor", () => {
    const mockUser: UsuarioInfoResponse = { 
      idUsuario: 1, 
      nombreCompleto: "John Doe", 
      correoElectronico: "john@example.com",
      idIdentificacion: "123456",
      telefono: "1234567890",
      fechaNacimiento: "1990-01-01",
      rol: "SUPERVISOR_EMPRESA" as UserRole,
      estadoUsuario: "ACTIVO" as UserStatus,
      fechaCreacion: "2024-01-01",
    };
    useAuthStore.getState().setUser(mockUser);

    expect(useAuthStore.getState().isSupervisor()).toBe(true);
  });

  it("should check if user is analyst", () => {
    const mockUser: UsuarioInfoResponse = { 
      idUsuario: 1, 
      nombreCompleto: "John Doe", 
      correoElectronico: "john@example.com",
      idIdentificacion: "123456",
      telefono: "1234567890",
      fechaNacimiento: "1990-01-01",
      rol: "ANALISTA_INTERNO" as UserRole,
      estadoUsuario: "ACTIVO" as UserStatus,
      fechaCreacion: "2024-01-01",
    };
    useAuthStore.getState().setUser(mockUser);

    expect(useAuthStore.getState().isAnalyst()).toBe(true);
  });

  it("should check if user is employee", () => {
    const mockUser: UsuarioInfoResponse = { 
      idUsuario: 1, 
      nombreCompleto: "John Doe", 
      correoElectronico: "john@example.com",
      idIdentificacion: "123456",
      telefono: "1234567890",
      fechaNacimiento: "1990-01-01",
      rol: "EMPLEADO_VENTANILLA" as UserRole,
      estadoUsuario: "ACTIVO" as UserStatus,
      fechaCreacion: "2024-01-01",
    };
    useAuthStore.getState().setUser(mockUser);

    expect(useAuthStore.getState().isEmployee()).toBe(true);
  });

  it("should check if user is client", () => {
    const mockUser: UsuarioInfoResponse = { 
      idUsuario: 1, 
      nombreCompleto: "John Doe", 
      correoElectronico: "john@example.com",
      idIdentificacion: "123456",
      telefono: "1234567890",
      fechaNacimiento: "1990-01-01",
      rol: "CLIENTE_EMPRESA" as UserRole,
      estadoUsuario: "ACTIVO" as UserStatus,
      fechaCreacion: "2024-01-01",
    };
    useAuthStore.getState().setUser(mockUser);

    expect(useAuthStore.getState().isClient()).toBe(true);
  });
});
