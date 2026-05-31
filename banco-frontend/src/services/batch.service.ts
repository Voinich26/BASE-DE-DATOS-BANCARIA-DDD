import { apiGet, apiPost } from "./api";
import type {
  LoteTransferenciaResponse,
  PagedResponse,
} from "@/types/api.types";

export interface ItemLoteRequest {
  cuentaOrigen: string;
  cuentaDestino: string;
  monto: number;
  conceptoDetalle?: string;
  // alias interno del formulario — se mapea a conceptoDetalle al enviar
  concepto?: string;
}

export interface CrearLoteRequest {
  nitEmpresa: string;
  concepto: string;
  idUsuarioCreador: number;
  transferencias: ItemLoteRequest[];
}export interface LoteMetricasResponse {
  totalLotes: number;
  distribucionPorEstado: Record<string, number>;
  totalItemsProcesados: number;
  totalItemsFallidos: number;
  montoTotalProcesado: number;
  tasaExitoLotes: number;
  tasaRechazoLotes: number;
  tasaExitoItems: number;
  generadoEn: string;
}

export const batchService = {
  async getAll(page = 0, size = 20): Promise<PagedResponse<LoteTransferenciaResponse>> {
    const res = await apiGet<PagedResponse<LoteTransferenciaResponse>>(
      `/v1/batches?page=${page}&size=${size}`
    );
    return res.data;
  },

  async getById(id: number): Promise<LoteTransferenciaResponse> {
    const res = await apiGet<LoteTransferenciaResponse>(`/v1/batches/${id}`);
    return res.data;
  },

  async getMetrics(): Promise<LoteMetricasResponse> {
    const res = await apiGet<LoteMetricasResponse>("/v1/batches/metrics");
    return res.data;
  },

  async crear(data: CrearLoteRequest): Promise<LoteTransferenciaResponse> {
    // Normalizar: el backend espera "transferencias" con campo "conceptoDetalle"
    const payload = {
      ...data,
      transferencias: data.transferencias.map(({ concepto, conceptoDetalle, ...rest }) => ({
        ...rest,
        conceptoDetalle: conceptoDetalle ?? concepto ?? "",
      })),
    };
    const res = await apiPost<LoteTransferenciaResponse>("/v1/batches", payload);
    return res.data;
  },

  async procesar(id: number, idSupervisor: number): Promise<LoteTransferenciaResponse> {
    const res = await apiPost<LoteTransferenciaResponse>(
      `/v1/batches/${id}/process`,
      { idSupervisor }
    );
    return res.data;
  },

  async aprobar(id: number, idSupervisor: number): Promise<LoteTransferenciaResponse> {
    return this.procesar(id, idSupervisor);
  },

  async rechazar(
    id: number,
    idSupervisor: number,
    motivo: string
  ): Promise<LoteTransferenciaResponse> {
    const res = await apiPost<LoteTransferenciaResponse>(
      `/v1/batches/${id}/reject`,
      { idSupervisor, motivo }
    );
    return res.data;
  },
};
