import { apiGet, apiPost } from "./api";
import type {
  TransferenciaResponse,
  TransferenciaDashboardResponse,
  TransferenciaMetricasResponse,
  PagedResponse,
} from "@/types/api.types";

export const transferService = {
  async getDashboard(): Promise<TransferenciaDashboardResponse> {
    const res = await apiGet<TransferenciaDashboardResponse>("/v1/transfers/dashboard");
    return res.data;
  },

  async getHistory(params?: {
    estado?: string;
    cuentaOrigen?: string;
    cuentaDestino?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<TransferenciaResponse>> {
    const query = new URLSearchParams();
    if (params?.estado) query.set("estado", params.estado);
    if (params?.cuentaOrigen) query.set("cuentaOrigen", params.cuentaOrigen);
    if (params?.cuentaDestino) query.set("cuentaDestino", params.cuentaDestino);
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(params?.size ?? 20));
    const res = await apiGet<PagedResponse<TransferenciaResponse>>(
      `/v1/transfers/history?${query.toString()}`
    );
    return res.data;
  },

  async getPending(page = 0, size = 20): Promise<PagedResponse<TransferenciaResponse>> {
    const res = await apiGet<PagedResponse<TransferenciaResponse>>(
      `/v1/transfers/pending?page=${page}&size=${size}`
    );
    return res.data;
  },

  async getMetrics(): Promise<TransferenciaMetricasResponse> {
    const res = await apiGet<TransferenciaMetricasResponse>("/v1/transfers/metrics");
    return res.data;
  },

  async create(data: {
    cuentaOrigen: string;
    cuentaDestino: string;
    monto: number;
    idUsuarioCreador: number;
  }): Promise<TransferenciaResponse> {
    const res = await apiPost<TransferenciaResponse>("/v1/transfers", data);
    return res.data;
  },

  async approve(id: number, idSupervisor: number): Promise<TransferenciaResponse> {
    const res = await apiPost<TransferenciaResponse>(
      `/v1/transfers/${id}/approve?idSupervisor=${idSupervisor}`
    );
    return res.data;
  },

  async reject(id: number, idSupervisor: number, motivo: string): Promise<TransferenciaResponse> {
    const res = await apiPost<TransferenciaResponse>(`/v1/transfers/${id}/reject`, {
      idSupervisor,
      motivo,
    });
    return res.data;
  },
};
