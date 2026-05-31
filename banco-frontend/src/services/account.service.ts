import { apiGet, apiPost, apiPatch } from "./api";
import type {
  CuentaBancariaResponse,
  DashboardFinancieroResponse,
  PagedResponse,
  ApiResponse,
} from "@/types/api.types";

export const accountService = {
  async getDashboard(): Promise<DashboardFinancieroResponse> {
    const res = await apiGet<DashboardFinancieroResponse>("/v1/accounts/dashboard");
    return res.data;
  },

  async getAll(page = 0, size = 20): Promise<PagedResponse<CuentaBancariaResponse>> {
    const res = await apiGet<PagedResponse<CuentaBancariaResponse>>(
      `/v1/accounts?page=${page}&size=${size}`
    );
    return res.data;
  },

  async getByNumber(accountNumber: string): Promise<CuentaBancariaResponse> {
    const res = await apiGet<CuentaBancariaResponse>(`/v1/accounts/${accountNumber}`);
    return res.data;
  },

  async getByClient(clientId: string, page = 0, size = 20): Promise<PagedResponse<CuentaBancariaResponse>> {
    const res = await apiGet<PagedResponse<CuentaBancariaResponse>>(
      `/v1/accounts/client/${clientId}?page=${page}&size=${size}`
    );
    return res.data;
  },

  async create(data: {
    numeroCuenta: string;
    nombreTipoCuenta: string;
    idTitular: string;
    tipoTitular: string;
    codigoIsoMoneda: string;
    saldoInicial: number;
    idUsuarioApertura: number;
  }): Promise<CuentaBancariaResponse> {
    const res = await apiPost<CuentaBancariaResponse>("/v1/accounts", data);
    return res.data;
  },

  async deposit(data: {
    numeroCuenta: string;
    monto: number;
    idUsuario: number;
    concepto: string;
  }): Promise<ApiResponse<void>> {
    return apiPost<void>("/v1/accounts/deposit", data);
  },

  async withdraw(data: {
    numeroCuenta: string;
    monto: number;
    idUsuario: number;
    concepto: string;
  }): Promise<ApiResponse<void>> {
    return apiPost<void>("/v1/accounts/withdraw", data);
  },

  async block(accountNumber: string, idUsuario: number, motivo: string): Promise<ApiResponse<void>> {
    return apiPatch<void>(
      `/v1/accounts/${accountNumber}/block?idUsuario=${idUsuario}`,
      { motivo }
    );
  },

  async reactivate(accountNumber: string, idUsuario: number): Promise<ApiResponse<void>> {
    return apiPatch<void>(`/v1/accounts/${accountNumber}/reactivate?idUsuario=${idUsuario}`);
  },

  async cancel(accountNumber: string, idUsuario: number): Promise<ApiResponse<void>> {
    return apiPatch<void>(`/v1/accounts/${accountNumber}/cancel?idUsuario=${idUsuario}`);
  },
};
