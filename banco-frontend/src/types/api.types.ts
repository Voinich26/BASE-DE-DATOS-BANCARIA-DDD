// ══════════════════════════════════════════════════════════════════════════════
// API Response Types — matches Spring Boot ApiResponse<T> wrapper
// ══════════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  path?: string;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  fieldErrors?: FieldError[];
  timestamp: string;
}

export interface FieldError {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  idUsuario: number;
  nombreCompleto: string;
  correoElectronico: string;
  rol: UserRole;
}

export interface UsuarioInfoResponse {
  idUsuario: number;
  nombreCompleto: string;
  correoElectronico: string;
  idIdentificacion: string;
  telefono: string;
  fechaNacimiento: string;
  direccion?: string;
  rol: UserRole;
  estadoUsuario: UserStatus;
  fechaCreacion: string;
  fechaModificacion?: string;
}

// ── Roles & Status ────────────────────────────────────────────────────────────

export type UserRole =
  | "ADMINISTRADOR"
  | "SUPERVISOR_EMPRESA"
  | "ANALISTA_INTERNO"
  | "EMPLEADO_VENTANILLA"
  | "EMPLEADO_COMERCIAL"
  | "CLIENTE_EMPRESA"
  | "CLIENTE_PERSONA"
  | "CLIENTE_PERSONA_NATURAL";

export type UserStatus = "Activo" | "Inactivo" | "Bloqueado";

export type AccountStatus = "Activa" | "Bloqueada" | "Cancelada";

export type TransferStatus =
  | "Pendiente"
  | "En Espera de Aprobacion"
  | "Ejecutada"
  | "Rechazada"
  | "Vencida";

export type LoanStatus =
  | "Solicitado"
  | "En Revision"
  | "Aprobado"
  | "Rechazado"
  | "Desembolsado"
  | "Cancelado";

export type BatchStatus =
  | "Pendiente"
  | "En Revision"
  | "Aprobado"
  | "Procesado"
  | "Rechazado";

// ── Accounts ──────────────────────────────────────────────────────────────────

export interface CuentaBancariaResponse {
  numeroCuenta: string;
  tipoCuenta: string;
  idTitular: string;
  tipoTitular: string;
  saldoActual: number;
  moneda: string;
  codigoIsoMoneda: string;
  estadoCuenta: AccountStatus;
  fechaApertura: string;
  fechaCreacion?: string;
}

export interface DashboardFinancieroResponse {
  idTitular: string;
  nombreTitular: string;
  totalCuentasActivas: number;
  totalCuentasBloqueadas: number;
  totalCuentasCanceladas: number;
  saldoTotalConsolidado: number;
  cuentas: CuentaBancariaResponse[];
  transferenciasPendientes: number;
  ultimasTransferencias: TransferenciaResumenItem[];
  generadoEn: string;
}

export interface TransferenciaResumenItem {
  idTransferencia: number;
  cuentaContraparte: string;
  direccion: "ENVIADA" | "RECIBIDA";
  monto: number;
  estado: string;
  fecha: string;
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export interface TransferenciaResponse {
  idTransferencia: number;
  cuentaOrigen: string;
  cuentaDestino: string;
  monto: number;
  estadoTransferencia: TransferStatus;
  idUsuarioCreador?: number;
  nombreUsuarioCreador?: string;
  idUsuarioAprobador?: number;
  fechaCreacion: string;
  fechaAprobacion?: string;
  fechaVencimiento?: string;
  requiereAprobacion: boolean;
  saldoOrigenAntes?: number;
  saldoOrigenDespues?: number;
  estadoFinal: boolean;
  vencida?: boolean;
}

export interface TransferenciaDashboardResponse {
  totalEnviadas: number;
  totalRecibidas: number;
  totalPendientes: number;
  totalEnEspera: number;
  totalEjecutadas: number;
  totalRechazadas: number;
  totalVencidas: number;
  montoTotalEnviado: number;
  montoTotalRecibido: number;
  montoEnEspera: number;
  ultimasTransferencias: TransferenciaResponse[];
  cuentasIncluidas?: string[];
  generadoEn?: string;
}

export interface TransferenciaDetalleResponse extends TransferenciaResponse {
  nombreUsuarioAprobador?: string;
  saldoDestinoAntes?: number;
  saldoDestinoDespues?: number;
}

// ── Loans ─────────────────────────────────────────────────────────────────────

export interface PrestamoResponse {
  idPrestamo: number;
  tipoPrestamo: string;
  idClienteSolicitante: string;
  tipoCliente: string;
  montoSolicitado: number;
  montoAprobado?: number;
  tasaInteres?: number;
  plazoMeses?: number;
  estadoPrestamo: LoanStatus;
  idUsuarioSolicitante?: number;
  idAnalistaAprobador?: number;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  fechaDesembolso?: string;
  cuentaDestinoDesembolso?: string;
}

export interface PrestamoDetalleResponse extends PrestamoResponse {
  nombreClienteSolicitante?: string;
  nombreUsuarioSolicitante?: string;
  nombreAnalistaAprobador?: string;
  cuotaMensualEstimada?: number;
  estadoFinal?: boolean;
  fechaModificacion?: string;
}

// ── Batches ───────────────────────────────────────────────────────────────────

export interface LoteTransferenciaResponse {
  idLote: number;
  nitEmpresa: string;
  razonSocialEmpresa: string;
  concepto: string;
  estadoLote: BatchStatus;
  estadoFinal: boolean;
  totalItems: number;
  itemsExitosos?: number;
  itemsFallidos?: number;
  montoTotal: number;
  montoProcesado?: number;
  idUsuarioCreador?: number;
  nombreUsuarioCreador?: string;
  fechaCreacion: string;
  fechaProcesamiento?: string;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UsuarioResponse {
  idUsuario: number;
  nombreCompleto: string;
  correoElectronico: string;
  idIdentificacion: string;
  telefono: string;
  rol: UserRole;
  estadoUsuario: UserStatus;
  fechaCreacion: string;
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export interface TransferenciaMetricasResponse {
  totalTransferencias: number;
  distribucionPorEstado: Record<string, number>;
  montoTotalProcesado: number;
  montoPromedio: number;
  montoMaximo: number;
  montoMinimo: number;
  pendientesEjecucion: number;
  enEsperaAprobacion: number;
  vencidas: number;
  tasaExito: number;
  tasaRechazo: number;
  generadoEn: string;
}

export interface LoteMetricasResponse {
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
