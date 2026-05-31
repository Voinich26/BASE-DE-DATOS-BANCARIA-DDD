import { apiGet } from "./api";
import type { PagedResponse } from "@/types/api.types";

// Mapea los campos reales de BitacolaResponse del backend
export interface AuditLogResponse {
  idBitacola: string;
  tipoOperacion: string;
  fechaHoraOperacion: string;
  idUsuario: number;
  rolUsuario: string;
  idProductoAfectado: string;
  tipoProducto: string;
  datosDetalle?: string;
  sincronizado: boolean;
}

export const auditService = {
  async getAll(
    params?: {
      tipoOperacion?: string;
      idUsuario?: number;
      page?: number;
      size?: number;
    }
  ): Promise<PagedResponse<AuditLogResponse>> {
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(params?.size ?? 50));

    // Si hay filtro por usuario, usar el endpoint específico
    if (params?.idUsuario) {
      const res = await apiGet<PagedResponse<AuditLogResponse>>(
        `/v1/bitacola/usuario/${params.idUsuario}?${query.toString()}`
      );
      return res.data;
    }

    // Si hay filtro por tipo de operación, usar el endpoint específico
    if (params?.tipoOperacion) {
      const res = await apiGet<PagedResponse<AuditLogResponse>>(
        `/v1/bitacola/operacion/${encodeURIComponent(params.tipoOperacion)}?${query.toString()}`
      );
      return res.data;
    }

    // Sin filtros: listar todo
    const res = await apiGet<PagedResponse<AuditLogResponse>>(
      `/v1/bitacola?${query.toString()}`
    );
    return res.data;
  },
};
