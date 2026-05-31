# Row-Level Security (RLS) - Guía de Implementación

## Cambios en MySQL 8.0

**Problema:** MySQL 8.0+ no permite variables de sesión (@id_usuario_sesion, @rol_sesion, @id_empresa_sesion) dentro de vistas.

**Error:** `Error Code: 1351 - View's SELECT contains a variable or parameter`

## Solución Implementada

### Arquitectura Nueva: Filtrado en 3 niveles

Las vistas en `04_constraints.sql` han sido convertidas a **vistas genéricas del dominio** que retornan **TODOS** los datos sin filtrar.

El filtrado por usuario/rol se delega a:

1. **Stored Procedures (SPs)** - Lógica de negocio con parámetros explícitos
2. **Backend/aplicación** - Filtrado en memoria o con queries parametrizadas
3. **Queries parametrizadas** - Consultas dinámicas con WHERE adicionales

---

## Mapeo de Vistas y Estrategia de Filtrado

### Grupo 1: Cliente Persona Natural (RP-15)

| Vista | Contenido | Columnas de Filtrado | Estrategia |
|-------|----------|----------------------|-----------|
| `v_cuentas_cliente_pn` | Cuentas de personas naturales | `id_usuario`, `id_identificacion` | `WHERE id_usuario = ?` |
| `v_prestamos_cliente_pn` | Préstamos de personas naturales | `id_usuario`, `id_identificacion` | `WHERE id_usuario = ?` |
| `v_transferencias_cliente_pn` | Transferencias creadas | `id_usuario_creador` | `WHERE id_usuario_creador = ?` |

**Ejemplo de SP wrapper:**
```sql
CREATE PROCEDURE sp_obtener_mis_cuentas(IN p_id_usuario INT)
BEGIN
    SELECT * FROM v_cuentas_cliente_pn 
    WHERE id_usuario = p_id_usuario;
END //
```

**Ejemplo de backend:**
```javascript
const userId = req.user.id; // Del JWT/sesión
const query = `SELECT * FROM v_cuentas_cliente_pn WHERE id_usuario = ?`;
const results = await db.query(query, [userId]);
```

---

### Grupo 2: Cliente Empresa (RP-16)

| Vista | Contenido | Columnas de Filtrado | Estrategia |
|-------|----------|----------------------|-----------|
| `v_cuentas_empresa` | Cuentas de empresas | `id_usuario`, `nit` | `WHERE id_usuario = ?` |
| `v_prestamos_empresa` | Préstamos de empresas | `id_usuario`, `nit` | `WHERE id_usuario = ?` |

**Ejemplo de SP wrapper:**
```sql
CREATE PROCEDURE sp_obtener_cuentas_mi_empresa(IN p_id_usuario INT)
BEGIN
    SELECT * FROM v_cuentas_empresa 
    WHERE id_usuario = p_id_usuario;
END //
```

---

### Grupo 3: Empleado Empresa (RP-19)

| Vista | Contenido | Columnas de Filtrado | Estrategia |
|-------|----------|----------------------|-----------|
| `v_transferencias_empresa_op` | Transferencias de empresas | `id_usuario`, `nit` | `WHERE id_usuario = ?` |

**Nota:** Esta vista ya hace JOINs con cliente_empresa, por lo que el filtrado es:
```sql
WHERE id_usuario = ?
```

---

### Grupo 4: Supervisor Empresa (RP-20)

| Vista | Contenido | Condiciones | Estrategia |
|-------|----------|-------------|-----------|
| `v_transferencias_supervisor` | Transferencias pendientes de aprobación | `requiere_aprobacion = TRUE` + estado 'En Espera de Aprobacion' + su empresa | `WHERE id_usuario = ?` |

**Nota:** Esta vista **ya filtra por estado** (no requiere aprobación en WHERE), pero necesita el filtrado por empresa.

---

### Grupo 5: Analista Interno (RP-21)

| Vista | Contenido | Notas |
|-------|----------|-------|
| `v_prestamos_analista` | Todos los préstamos | ✅ Sin filtrado (es un analista) |
| `v_bitacora_analista` | Toda la bitácora | ✅ Sin filtrado (es un analista) |

**No requieren cambios en la estrategia.**

---

### Grupo 6: Bitácora para Clientes

| Vista | Contenido | Cambio |
|-------|----------|--------|
| `v_bitacora_cliente_pn` | Bitácora completa | Ahora retorna **TODA** la bitácora (sin filtros) |
| `v_bitacora_empresa` | Bitácora completa | Ahora retorna **TODA** la bitácora (sin filtros) |

**Estrategia de filtrado en el backend:**
```javascript
// Opción 1: Filtrar en backend después de obtener datos
const allBitacora = await db.query('SELECT * FROM v_bitacora_cliente_pn');
const userBitacora = allBitacora.filter(record => {
    // Lógica de filtrado: registros de cuentas/préstamos/transferencias del usuario
    return isRecordRelatedToUser(record, userId);
});

// Opción 2: Usar query parametrizada en lugar de la vista
const query = `
    SELECT * FROM bitacora_cola bc
    WHERE bc.id_producto_afectado IN (
        SELECT CAST(cb.numero_cuenta AS CHAR)
        FROM cuenta_bancaria cb
        JOIN cliente_persona_natural cpn 
            ON cb.id_titular = cpn.id_identificacion
        WHERE cpn.id_usuario = ?
    )
    OR bc.id_producto_afectado IN (
        SELECT CAST(p.id_prestamo AS CHAR)
        FROM prestamo p
        JOIN cliente_persona_natural cpn 
            ON p.id_cliente_solicitante = cpn.id_identificacion
        WHERE cpn.id_usuario = ?
    )
`;
const results = await db.query(query, [userId, userId]);
```

---

## Checklist de Implementación

### Fase 1: SPs Wrapper (Recomendado)
- [ ] Crear SP para cada vista con parámetros explícitos
- [ ] Validar que los parámetros coincidan con columnas de filtrado
- [ ] Probar cada SP con datos de prueba

### Fase 2: Backend (Aplicación)
- [ ] Extraer userId/userRole de JWT/sesión
- [ ] Usar SPs wrapper o queries parametrizadas
- [ ] **Nunca** usar variables de sesión (@) en SPs o vistas

### Fase 3: Auditoría
- [ ] Verificar que las vistas no contienen WHERE con variables
- [ ] Confirmar que el filtrado ocurre en SPs o backend
- [ ] Validar permisos con casos de prueba

---

## Checklist de Compatibilidad MySQL 8.0

✅ **04_constraints.sql:**
- Vistas sin variables de sesión (@)
- Vistas incluyen columnas de filtrado (id_usuario, nit, id_usuario_creador)
- Comentarios documentan dónde hacer el filtrado

✅ **Codebase:**
- [x] No hay referencias a variables de sesión en vistas
- [x] Todas las vistas son genéricas del dominio
- [x] SPs existentes pueden ser wrappers o ejecutarse directamente

---

## Ejemplo: Implementación Completa en Backend

### TypeScript/Node.js

```typescript
import db from './database';

interface User {
  id: number;
  role: string;
  identificacion?: string;
  nit?: string;
}

class AccountService {
  async getMyCuentas(user: User): Promise<Account[]> {
    const query = `
      SELECT * FROM v_cuentas_cliente_pn 
      WHERE id_usuario = ?
    `;
    return db.query(query, [user.id]);
  }

  async getMisTransferencias(user: User): Promise<Transfer[]> {
    const query = `
      SELECT * FROM v_transferencias_cliente_pn 
      WHERE id_usuario_creador = ?
    `;
    return db.query(query, [user.id]);
  }

  async getEmpresaCuentas(user: User): Promise<Account[]> {
    const query = `
      SELECT * FROM v_cuentas_empresa 
      WHERE id_usuario = ?
    `;
    return db.query(query, [user.id]);
  }

  async getSupervisorAprobaciones(user: User): Promise<Transfer[]> {
    const query = `
      SELECT * FROM v_transferencias_supervisor 
      WHERE id_usuario = ?
    `;
    return db.query(query, [user.id]);
  }

  async getBitacoraPersonal(user: User): Promise<Bitacora[]> {
    // Opción 1: Backend filtering
    const allRecords = await db.query(
      'SELECT * FROM v_bitacora_cliente_pn'
    );
    
    return allRecords.filter(record => {
      // Lógica: ¿es el registro relacionado a este usuario?
      return this.isRecordRelatedToUser(record, user);
    });
  }

  private isRecordRelatedToUser(record: Bitacora, user: User): boolean {
    // Verificar si el producto_afectado pertenece al usuario
    // (cuenta, préstamo, o transferencia creada por el usuario)
    return true; // Implementar lógica específica
  }
}
```

---

## Notas Finales

1. **No almacenar variables de sesión en vistas** - MySQL 8 no lo permite
2. **Parámetros explícitos > Variables implícitas** - Mejor para auditoría y testing
3. **Segregación clara** - Vistas = estructura, SPs/Backend = lógica de acceso
4. **Documentación** - Las vistas ahora documentan qué columnas usar para filtrado

---

**Archivo:** [04_constraints.sql](./Banco_Based/04_constraints.sql)  
**Compatibilidad:** ✅ MySQL 8.0+  
**Última actualización:** 2026-05-23
