import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountService } from "../account.service";

// Mock api functions
vi.mock("../api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

import { apiGet, apiPost, apiPatch } from "../api";

describe("AccountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboard", () => {
    it("should fetch dashboard successfully", async () => {
      const mockDashboard = {
        cuentas: [{ numeroCuenta: "123456", tipoCuenta: "Ahorros", saldo: 1000 }],
        totalSaldo: 1000,
      };
      (apiGet as any).mockResolvedValue({ data: mockDashboard });

      const result = await accountService.getDashboard();

      expect(apiGet).toHaveBeenCalledWith("/v1/accounts/dashboard");
      expect(result).toEqual(mockDashboard);
    });

    it("should handle errors when fetching dashboard", async () => {
      (apiGet as any).mockRejectedValue(new Error("Dashboard error"));

      await expect(accountService.getDashboard()).rejects.toThrow("Dashboard error");
    });
  });

  describe("getAll", () => {
    it("should fetch all accounts successfully", async () => {
      const mockAccounts = {
        content: [
          { numeroCuenta: "123456", tipoCuenta: "Ahorros", saldo: 1000 },
          { numeroCuenta: "789012", tipoCuenta: "Corriente", saldo: 5000 },
        ],
        totalElements: 2,
      };
      (apiGet as any).mockResolvedValue({ data: mockAccounts });

      const result = await accountService.getAll();

      expect(apiGet).toHaveBeenCalledWith("/v1/accounts?page=0&size=20");
      expect(result).toEqual(mockAccounts);
    });

    it("should fetch accounts with pagination", async () => {
      const mockAccounts = { content: [], totalElements: 0 };
      (apiGet as any).mockResolvedValue({ data: mockAccounts });

      await accountService.getAll(1, 10);

      expect(apiGet).toHaveBeenCalledWith("/v1/accounts?page=1&size=10");
    });
  });

  describe("getByNumber", () => {
    it("should fetch account by number successfully", async () => {
      const mockAccount = { numeroCuenta: "123456", tipoCuenta: "Ahorros", saldo: 1000 };
      (apiGet as any).mockResolvedValue({ data: mockAccount });

      const result = await accountService.getByNumber("123456");

      expect(apiGet).toHaveBeenCalledWith("/v1/accounts/123456");
      expect(result).toEqual(mockAccount);
    });

    it("should handle errors when fetching account by number", async () => {
      (apiGet as any).mockRejectedValue(new Error("Account not found"));

      await expect(accountService.getByNumber("123456")).rejects.toThrow("Account not found");
    });
  });

  describe("create", () => {
    it("should create account successfully", async () => {
      const mockAccount = { numeroCuenta: "123456", tipoCuenta: "Ahorros", saldo: 1000 };
      const accountData = {
        numeroCuenta: "123456",
        nombreTipoCuenta: "Ahorros",
        idTitular: "1",
        tipoTitular: "TITULAR",
        codigoIsoMoneda: "USD",
        saldoInicial: 1000,
        idUsuarioApertura: 1,
      };
      (apiPost as any).mockResolvedValue({ data: mockAccount });

      const result = await accountService.create(accountData);

      expect(apiPost).toHaveBeenCalledWith("/v1/accounts", accountData);
      expect(result).toEqual(mockAccount);
    });
  });

  describe("deposit", () => {
    it("should deposit to account successfully", async () => {
      const depositData = {
        numeroCuenta: "123456",
        monto: 500,
        idUsuario: 1,
        concepto: "Deposit",
      };
      (apiPost as any).mockResolvedValue({ data: null });

      await accountService.deposit(depositData);

      expect(apiPost).toHaveBeenCalledWith("/v1/accounts/deposit", depositData);
    });
  });

  describe("withdraw", () => {
    it("should withdraw from account successfully", async () => {
      const withdrawData = {
        numeroCuenta: "123456",
        monto: 200,
        idUsuario: 1,
        concepto: "Withdrawal",
      };
      (apiPost as any).mockResolvedValue({ data: null });

      await accountService.withdraw(withdrawData);

      expect(apiPost).toHaveBeenCalledWith("/v1/accounts/withdraw", withdrawData);
    });
  });

  describe("block", () => {
    it("should block account successfully", async () => {
      (apiPatch as any).mockResolvedValue({ data: null });

      await accountService.block("123456", 1, "Fraud");

      expect(apiPatch).toHaveBeenCalledWith(
        "/v1/accounts/123456/block?idUsuario=1",
        { motivo: "Fraud" }
      );
    });
  });

  describe("reactivate", () => {
    it("should reactivate account successfully", async () => {
      (apiPatch as any).mockResolvedValue({ data: null });

      await accountService.reactivate("123456", 1);

      expect(apiPatch).toHaveBeenCalledWith("/v1/accounts/123456/reactivate?idUsuario=1");
    });
  });

  describe("cancel", () => {
    it("should cancel account successfully", async () => {
      (apiPatch as any).mockResolvedValue({ data: null });

      await accountService.cancel("123456", 1);

      expect(apiPatch).toHaveBeenCalledWith("/v1/accounts/123456/cancel?idUsuario=1");
    });
  });
});
