import { apiGet, apiPost, apiPatch } from "./api";
import type {
  UsuarioInfoResponse,
  PagedResponse,
  ApiResponse,
} from "@/types/api.types";

export interface CreateUserRequest {
  nombreCompleto: string;
  correoElectronico: string;
  idIdentificacion: string;
  telefono: string;
  fechaNacimiento: string;
  direccion?: string;
  rol: string;
  contrasena: string;
}

export interface UpdateUserRequest {
  nombreCompleto?: string;
  correoElectronico?: string;
  telefono?: string;
  direccion?: string;
  estadoUsuario?: string;
}

export const userService = {
  async getAll(page = 0, size = 20): Promise<PagedResponse<UsuarioInfoResponse>> {
    const res = await apiGet<PagedResponse<UsuarioInfoResponse>>(
      `/v1/usuarios?page=${page}&size=${size}`
    );
    return res.data;
  },

  async getById(id: number): Promise<UsuarioInfoResponse> {
    const res = await apiGet<UsuarioInfoResponse>(`/v1/usuarios/${id}`);
    return res.data;
  },

  async create(data: CreateUserRequest): Promise<UsuarioInfoResponse> {
    const res = await apiPost<UsuarioInfoResponse>("/v1/usuarios", data);
    return res.data;
  },

  async changeStatus(id: number, nuevoEstado: string, motivo = ""): Promise<ApiResponse<void>> {
    return apiPatch<void>(`/v1/usuarios/${id}/estado?nuevoEstado=${encodeURIComponent(nuevoEstado)}&motivo=${encodeURIComponent(motivo)}`);
  },

  async assignRole(id: number, nombreRol: string): Promise<ApiResponse<void>> {
    return apiPatch<void>(`/v1/usuarios/${id}/rol?nombreRol=${encodeURIComponent(nombreRol)}`);
  },
};
