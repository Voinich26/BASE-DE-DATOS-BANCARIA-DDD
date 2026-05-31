/**
 * Mock Data Generator - BancoDDD Enterprise Demo Mode
 * 
 * Generates realistic mock data for demo purposes when backend is not available.
 */

import type {
  CuentaBancariaResponse,
  DashboardFinancieroResponse,
  TransferenciaResponse,
  PrestamoResponse,
  LoteTransferenciaResponse,
  UsuarioInfoResponse,
  AccountStatus,
  TransferStatus,
  LoanStatus,
  BatchStatus,
} from "@/types/api.types";

// ── Mock Configuration ─────────────────────────────────────────────────────────

const MOCK_DELAY = parseInt(process.env.NEXT_PUBLIC_MOCK_DELAY || "500", 10);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock Users ───────────────────────────────────────────────────────────────

export const mockUsers: UsuarioInfoResponse[] = [
  {
    idUsuario: 1,
    nombreCompleto: "Juan Pérez",
    correoElectronico: "juan.perez@bancoddd.com",
    idIdentificacion: "1234567890",
    telefono: "+57 300 123 4567",
    fechaNacimiento: "1990-01-15",
    direccion: "Calle 123 #45-67, Bogotá",
    rol: "ADMINISTRADOR",
    estadoUsuario: "Activo",
    fechaCreacion: "2024-01-01T00:00:00Z",
  },
  {
    idUsuario: 2,
    nombreCompleto: "María García",
    correoElectronico: "maria.garcia@bancoddd.com",
    idIdentificacion: "0987654321",
    telefono: "+57 310 987 6543",
    fechaNacimiento: "1985-05-20",
    direccion: "Carrera 45 #67-89, Medellín",
    rol: "SUPERVISOR_EMPRESA",
    estadoUsuario: "Activo",
    fechaCreacion: "2024-01-02T00:00:00Z",
  },
  {
    idUsuario: 3,
    nombreCompleto: "Carlos Rodríguez",
    correoElectronico: "carlos.rodriguez@bancoddd.com",
    idIdentificacion: "1122334455",
    telefono: "+57 320 456 7890",
    fechaNacimiento: "1992-08-10",
    direccion: "Avenida 10 #20-30, Cali",
    rol: "ANALISTA_INTERNO",
    estadoUsuario: "Activo",
    fechaCreacion: "2024-01-03T00:00:00Z",
  },
  {
    idUsuario: 4,
    nombreCompleto: "Ana Martínez",
    correoElectronico: "ana.martinez@bancoddd.com",
    idIdentificacion: "5544332211",
    telefono: "+57 315 234 5678",
    fechaNacimiento: "1988-12-25",
    direccion: "Calle 50 #100-200, Barranquilla",
    rol: "EMPLEADO_VENTANILLA",
    estadoUsuario: "Activo",
    fechaCreacion: "2024-01-04T00:00:00Z",
  },
];

// ── Mock Accounts ─────────────────────────────────────────────────────────────

export const mockAccounts: CuentaBancariaResponse[] = [
  {
    numeroCuenta: "1234567890",
    tipoCuenta: "Ahorros",
    idTitular: "1234567890",
    tipoTitular: "PERSONA_NATURAL",
    saldoActual: 15000.00,
    moneda: "USD",
    codigoIsoMoneda: "USD",
    estadoCuenta: "Activa" as AccountStatus,
    fechaApertura: "2024-01-01T00:00:00Z",
    fechaCreacion: "2024-01-01T00:00:00Z",
  },
  {
    numeroCuenta: "0987654321",
    tipoCuenta: "Corriente",
    idTitular: "0987654321",
    tipoTitular: "EMPRESA",
    saldoActual: 50000.00,
    moneda: "USD",
    codigoIsoMoneda: "USD",
    estadoCuenta: "Activa" as AccountStatus,
    fechaApertura: "2024-01-05T00:00:00Z",
    fechaCreacion: "2024-01-05T00:00:00Z",
  },
  {
    numeroCuenta: "1122334455",
    tipoCuenta: "Ahorros",
    idTitular: "1122334455",
    tipoTitular: "PERSONA_NATURAL",
    saldoActual: 8500.50,
    moneda: "USD",
    codigoIsoMoneda: "USD",
    estadoCuenta: "Activa" as AccountStatus,
    fechaApertura: "2024-01-10T00:00:00Z",
    fechaCreacion: "2024-01-10T00:00:00Z",
  },
  {
    numeroCuenta: "5544332211",
    tipoCuenta: "Corriente",
    idTitular: "5544332211",
    tipoTitular: "PERSONA_NATURAL",
    saldoActual: 22500.75,
    moneda: "USD",
    codigoIsoMoneda: "USD",
    estadoCuenta: "Activa" as AccountStatus,
    fechaApertura: "2024-01-15T00:00:00Z",
    fechaCreacion: "2024-01-15T00:00:00Z",
  },
  {
    numeroCuenta: "9876543210",
    tipoCuenta: "Ahorros",
    idTitular: "1234567890",
    tipoTitular: "PERSONA_NATURAL",
    saldoActual: 5000.00,
    moneda: "USD",
    codigoIsoMoneda: "USD",
    estadoCuenta: "Bloqueada" as AccountStatus,
    fechaApertura: "2023-12-01T00:00:00Z",
    fechaCreacion: "2023-12-01T00:00:00Z",
  },
];

// ── Mock Dashboard ─────────────────────────────────────────────────────────────

export const mockDashboard: DashboardFinancieroResponse = {
  idTitular: "1234567890",
  nombreTitular: "Juan Pérez",
  totalCuentasActivas: 4,
  totalCuentasBloqueadas: 1,
  totalCuentasCanceladas: 0,
  saldoTotalConsolidado: mockAccounts.reduce((sum, acc) => sum + acc.saldoActual, 0),
  cuentas: mockAccounts,
  transferenciasPendientes: 2,
  ultimasTransferencias: [],
  generadoEn: new Date().toISOString(),
};

// ── Mock Transfers ─────────────────────────────────────────────────────────────

export const mockTransfers: TransferenciaResponse[] = [
  {
    idTransferencia: 1,
    cuentaOrigen: "1234567890",
    cuentaDestino: "0987654321",
    monto: 1000.00,
    estadoTransferencia: "Ejecutada" as TransferStatus,
    idUsuarioCreador: 1,
    nombreUsuarioCreador: "Juan Pérez",
    idUsuarioAprobador: 2,
    fechaCreacion: "2024-01-20T10:30:00Z",
    fechaAprobacion: "2024-01-20T10:31:00Z",
    requiereAprobacion: false,
    saldoOrigenAntes: 16000.00,
    saldoOrigenDespues: 15000.00,
    estadoFinal: true,
  },
  {
    idTransferencia: 2,
    cuentaOrigen: "0987654321",
    cuentaDestino: "1122334455",
    monto: 2500.00,
    estadoTransferencia: "Ejecutada" as TransferStatus,
    idUsuarioCreador: 2,
    nombreUsuarioCreador: "María García",
    idUsuarioAprobador: 2,
    fechaCreacion: "2024-01-19T15:45:00Z",
    fechaAprobacion: "2024-01-19T15:46:00Z",
    requiereAprobacion: false,
    saldoOrigenAntes: 52500.00,
    saldoOrigenDespues: 50000.00,
    estadoFinal: true,
  },
  {
    idTransferencia: 3,
    cuentaOrigen: "1122334455",
    cuentaDestino: "5544332211",
    monto: 500.00,
    estadoTransferencia: "Pendiente" as TransferStatus,
    idUsuarioCreador: 3,
    nombreUsuarioCreador: "Carlos Rodríguez",
    fechaCreacion: "2024-01-20T09:00:00Z",
    requiereAprobacion: true,
    estadoFinal: false,
  },
  {
    idTransferencia: 4,
    cuentaOrigen: "5544332211",
    cuentaDestino: "1234567890",
    monto: 1500.00,
    estadoTransferencia: "Rechazada" as TransferStatus,
    idUsuarioCreador: 4,
    nombreUsuarioCreador: "Ana Martínez",
    fechaCreacion: "2024-01-18T14:20:00Z",
    fechaAprobacion: "2024-01-18T14:25:00Z",
    requiereAprobacion: true,
    estadoFinal: true,
    vencida: false,
  },
];

// ── Mock Loans ────────────────────────────────────────────────────────────────

export const mockLoans: PrestamoResponse[] = [
  {
    idPrestamo: 1,
    tipoPrestamo: "HIPOTECARIO",
    idClienteSolicitante: "1234567890",
    tipoCliente: "PERSONA_NATURAL",
    montoSolicitado: 100000.00,
    montoAprobado: 100000.00,
    tasaInteres: 8.5,
    plazoMeses: 360,
    estadoPrestamo: "Desembolsado" as LoanStatus,
    idUsuarioSolicitante: 1,
    idAnalistaAprobador: 3,
    fechaSolicitud: "2024-01-01T00:00:00Z",
    fechaAprobacion: "2024-01-05T00:00:00Z",
    fechaDesembolso: "2024-01-10T00:00:00Z",
    cuentaDestinoDesembolso: "1234567890",
  },
  {
    idPrestamo: 2,
    tipoPrestamo: "CONSUMO",
    idClienteSolicitante: "0987654321",
    tipoCliente: "EMPRESA",
    montoSolicitado: 25000.00,
    montoAprobado: 20000.00,
    tasaInteres: 12.0,
    plazoMeses: 24,
    estadoPrestamo: "Desembolsado" as LoanStatus,
    idUsuarioSolicitante: 2,
    idAnalistaAprobador: 3,
    fechaSolicitud: "2024-01-10T00:00:00Z",
    fechaAprobacion: "2024-01-12T00:00:00Z",
    fechaDesembolso: "2024-01-15T00:00:00Z",
    cuentaDestinoDesembolso: "0987654321",
  },
  {
    idPrestamo: 3,
    tipoPrestamo: "CONSUMO",
    idClienteSolicitante: "1122334455",
    tipoCliente: "PERSONA_NATURAL",
    montoSolicitado: 15000.00,
    montoAprobado: undefined,
    tasaInteres: undefined,
    plazoMeses: undefined,
    estadoPrestamo: "Solicitado" as LoanStatus,
    idUsuarioSolicitante: 3,
    idAnalistaAprobador: undefined,
    fechaSolicitud: "2024-01-18T00:00:00Z",
    fechaAprobacion: undefined,
    fechaDesembolso: undefined,
    cuentaDestinoDesembolso: undefined,
  },
];

// ── Mock Batches ───────────────────────────────────────────────────────────────

export const mockBatches: LoteTransferenciaResponse[] = [
  {
    idLote: 1,
    nitEmpresa: "900123456-1",
    razonSocialEmpresa: "Empresa Demo S.A.",
    concepto: "Nómina mensual",
    estadoLote: "Procesado" as BatchStatus,
    estadoFinal: true,
    totalItems: 50,
    itemsExitosos: 48,
    itemsFallidos: 2,
    montoTotal: 150000.00,
    montoProcesado: 145000.00,
    idUsuarioCreador: 2,
    nombreUsuarioCreador: "María García",
    fechaCreacion: "2024-01-15T00:00:00Z",
    fechaProcesamiento: "2024-01-15T02:30:00Z",
  },
  {
    idLote: 2,
    nitEmpresa: "900123456-1",
    razonSocialEmpresa: "Empresa Demo S.A.",
    concepto: "Pago proveedores",
    estadoLote: "Pendiente" as BatchStatus,
    estadoFinal: false,
    totalItems: 25,
    itemsExitosos: undefined,
    itemsFallidos: undefined,
    montoTotal: 75000.00,
    montoProcesado: undefined,
    idUsuarioCreador: 2,
    nombreUsuarioCreador: "María García",
    fechaCreacion: "2024-01-20T00:00:00Z",
    fechaProcesamiento: undefined,
  },
];

// ── Mock Helper Functions ───────────────────────────────────────────────────────

export async function mockGet<T>(data: T): Promise<{ success: boolean; data: T }> {
  await delay(MOCK_DELAY);
  return { success: true, data };
}

export async function mockPost<T>(data: T): Promise<{ success: boolean; data: T }> {
  await delay(MOCK_DELAY);
  return { success: true, data };
}

export async function mockPatch<T>(data: T): Promise<{ success: boolean; data: T }> {
  await delay(MOCK_DELAY);
  return { success: true, data };
}

export async function mockDelete(): Promise<{ success: boolean; data: null }> {
  await delay(MOCK_DELAY);
  return { success: true, data: null };
}
