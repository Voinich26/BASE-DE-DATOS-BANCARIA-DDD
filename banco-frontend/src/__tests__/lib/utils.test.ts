import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  maskAccountNumber,
  getInitials,
  getRoleLabel,
  getStatusColor,
  hasRole,
  isAdmin,
  isSupervisor,
  isClient,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats COP currency correctly", () => {
    const result = formatCurrency(1000000, "COP");
    expect(result).toContain("1");
    expect(result).toContain("000");
  });

  it("handles zero", () => {
    const result = formatCurrency(0);
    expect(result).toBeTruthy();
  });

  it("handles negative values", () => {
    const result = formatCurrency(-500000);
    expect(result).toContain("-");
  });
});

describe("maskAccountNumber", () => {
  it("masks middle digits of account number", () => {
    const result = maskAccountNumber("001-123456-01");
    expect(result).toContain("****");
    expect(result).not.toContain("123456");
  });

  it("returns dash for empty string", () => {
    expect(maskAccountNumber("")).toBe("—");
  });

  it("returns original if format doesn't match", () => {
    const result = maskAccountNumber("NOHYPHENS");
    expect(result).toBe("NOHYPHENS");
  });
});

describe("getInitials", () => {
  it("returns first two initials", () => {
    expect(getInitials("Juan Carlos Pérez")).toBe("JC");
  });

  it("handles single name", () => {
    expect(getInitials("Admin")).toBe("A");
  });
});

describe("getRoleLabel", () => {
  it("returns Spanish label for ADMINISTRADOR", () => {
    expect(getRoleLabel("ADMINISTRADOR")).toBe("Administrador");
  });

  it("returns Spanish label for CLIENTE_PERSONA", () => {
    expect(getRoleLabel("CLIENTE_PERSONA")).toBe("Cliente");
  });
});

describe("getStatusColor", () => {
  it("returns green class for Activa", () => {
    expect(getStatusColor("Activa")).toContain("emerald");
  });

  it("returns red class for Bloqueada", () => {
    expect(getStatusColor("Bloqueada")).toContain("red");
  });

  it("returns default for unknown status", () => {
    expect(getStatusColor("UNKNOWN")).toContain("slate");
  });
});

describe("role helpers", () => {
  it("hasRole returns true for matching role", () => {
    expect(hasRole("ADMINISTRADOR", "ADMINISTRADOR", "SUPERVISOR_EMPRESA")).toBe(true);
  });

  it("hasRole returns false for non-matching role", () => {
    expect(hasRole("CLIENTE_PERSONA", "ADMINISTRADOR")).toBe(false);
  });

  it("isAdmin returns true only for ADMINISTRADOR", () => {
    expect(isAdmin("ADMINISTRADOR")).toBe(true);
    expect(isAdmin("SUPERVISOR_EMPRESA")).toBe(false);
  });

  it("isSupervisor returns true for ADMINISTRADOR and SUPERVISOR_EMPRESA", () => {
    expect(isSupervisor("ADMINISTRADOR")).toBe(true);
    expect(isSupervisor("SUPERVISOR_EMPRESA")).toBe(true);
    expect(isSupervisor("CLIENTE_PERSONA")).toBe(false);
  });

  it("isClient returns true for client roles", () => {
    expect(isClient("CLIENTE_PERSONA")).toBe(true);
    expect(isClient("CLIENTE_EMPRESA")).toBe(true);
    expect(isClient("ADMINISTRADOR")).toBe(false);
  });
});

describe("formatRelativeTime", () => {
  it("returns 'Ahora mismo' for very recent dates", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("Ahora mismo");
  });

  it("returns dash for empty string", () => {
    expect(formatRelativeTime("")).toBe("—");
  });
});
