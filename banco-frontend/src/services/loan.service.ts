import { apiGet, apiPost } from "./api";
import type {
  PrestamoResponse,
  PagedResponse,
  ApiResponse,
} from "@/types/api.types";

export interface SolicitarPrestamoRequest {
  nombreTipoPrestamo: string;
  idClienteSolicitante: string;
  tipoCliente: string;
  montoSolicitado: number;
  idUsuarioSolicitante: number;
}

export interface AprobarPrestamoRequest {
  montoAprobado: number;
  tasaInteres: number;
  plazoMeses: number;
  idAnalista: number;
  cuentaDestinoDesembolso: string;
  comentario?: string;
}

export interface DesembolsarPrestamoRequest {
  idSupervisor: number;
}

export const loanService = {
  async getAll(page = 0, size = 20): Promise<PagedResponse<PrestamoResponse>> {
    const res = await apiGet<PagedResponse<PrestamoResponse>>(
      `/v1/prestamos?page=${page}&size=${size}`
    );
    return res.data;
  },

  async getById(id: number): Promise<PrestamoResponse> {
    const res = await apiGet<PrestamoResponse>(`/v1/prestamos/${id}`);
    return res.data;
  },

  async getByClient(
    clientId: string,
    page = 0,
    size = 20
  ): Promise<PagedResponse<PrestamoResponse>> {
    const res = await apiGet<PagedResponse<PrestamoResponse>>(
      `/v1/prestamos/cliente/${clientId}?page=${page}&size=${size}`
    );
    return res.data;
  },

  async solicitar(
    data: SolicitarPrestamoRequest
  ): Promise<PrestamoResponse> {
    const res = await apiPost<PrestamoResponse>("/v1/prestamos", data);
    return res.data;
  },

  async aprobar(
    id: number,
    data: AprobarPrestamoRequest
  ): Promise<PrestamoResponse> {
    const res = await apiPost<PrestamoResponse>(`/v1/prestamos/${id}/aprobar`, data);
    return res.data;
  },

  async rechazar(
    id: number,
    idAnalista: number,
    motivo: string
  ): Promise<PrestamoResponse> {
    const res = await apiPost<PrestamoResponse>(`/v1/prestamos/${id}/rechazar`, {
      idAnalista,
      motivo,
    });
    return res.data;
  },

  async desembolsar(
    id: number,
    data: DesembolsarPrestamoRequest
  ): Promise<PrestamoResponse> {
    const res = await apiPost<PrestamoResponse>(
      `/v1/prestamos/${id}/desembolsar`,
      data
    );
    return res.data;
  },
};
