Actividad: Funcionamiento de la Aplicación de Gestión de Información de un Banco
Introducción y Objetivo del Proyecto

El presente enunciado define los requisitos funcionales y de negocio para el desarrollo de un sistema de información enfocado en la gestión de clientes, productos y operaciones clave de una entidad bancaria.

El objetivo de este proyecto es que diseñe e implemente una aplicación robusta, segura y escalable que cumpla con las normativas y flujos de trabajo descritos, infiriendo el modelo de datos (relacional y no relacional), las validaciones y los casos de uso a partir de la narrativa de negocio.

La aplicación servirá como el core transaccional y de gestión de la información fundamental del banco, permitiendo a distintos roles interactuar con los datos de clientes (personas naturales y empresas), cuentas, préstamos y transferencias, siempre bajo estrictas reglas de negocio y flujos de aprobación bien definidos.

Descripción de los Roles

El sistema debe contemplar un modelo de acceso basado en roles, donde la visibilidad de la información y la capacidad de realizar operaciones están estrictamente limitadas por las responsabilidades de cada usuario dentro del banco o como cliente.

Cliente Persona Natural

Este rol corresponde a los usuarios individuales del banco.

Campos
Campo	Descripción	Restricciones y Formato
Nombre completo	Nombre y apellidos de la persona	Obligatorio
Número de identificación	Cédula, DNI u otro identificador nacional	Único en todo el aplicativo
Correo electrónico	Dirección de contacto principal	Obligatorio. Debe contener "@" y un dominio
Número de teléfono	Teléfono de contacto	Obligatorio. Longitud mínima de 7 dígitos y máxima de 15
Fecha de nacimiento	Fecha de nacimiento de la persona	Obligatorio. Formato DD/MM/YYYY. Debe ser mayor de edad
Dirección	Domicilio registrado	Obligatorio
Rol	Cliente Persona Natural	Valor fijo
Visibilidad y Operaciones
Solo puede visualizar:
Sus cuentas
Sus préstamos
Su historial de transferencias
Puede:
Solicitar préstamos
Realizar transferencias propias o a terceros
No puede ver información de otros clientes
Cliente Empresa

Representa a una entidad legal.

Campos
Campo	Descripción	Restricciones
Razón Social	Nombre legal de la empresa	Obligatorio
Número de identificación Fiscal (NIT)	Identificador tributario	Único
Correo electrónico	Correo corporativo	Obligatorio
Número de teléfono	Teléfono	Obligatorio (7–15 dígitos)
Dirección	Domicilio fiscal	Obligatorio
Representante Legal	Referencia a Persona Natural	Obligatorio
Rol	Cliente Empresa	Valor fijo
Visibilidad y Operaciones
Puede ver cuentas y préstamos de la empresa
Puede delegar permisos
Puede aprobar transferencias de alto valor
Empleado de Ventanilla
Puede consultar saldo y estado de cuentas
Puede abrir cuentas
No puede aprobar préstamos ni ver riesgos
Empleado Comercial
Gestiona productos
Puede crear solicitudes
No puede aprobar ni modificar saldos
Empleado de Empresa
Puede crear transferencias y pagos masivos
Solo ve su empresa
Transferencias grandes requieren aprobación
Supervisor de Empresa
Aprueba o rechaza transferencias
Gestiona usuarios operativos
Analista Interno del Banco
Aprueba o rechaza préstamos
Accede a toda la información
Consulta bitácora completa
Información de los Usuarios del Sistema
Campo	Descripción	Tipo
ID_Usuario	Identificador único	Entero
ID_Relacionado	ID de cliente asociado	Texto/Numérico
Nombre_Completo	Nombre del usuario	Texto
ID_Identificacion	Documento	Texto
Correo_Electronico	Email	Texto
Telefono	Teléfono	Texto
Fecha_Nacimiento	Fecha	Fecha
Direccion	Dirección	Texto
Rol_Sistema	Rol	Catálogo
Estado_Usuario	Estado	Catálogo
Productos y Servicios Bancarios
Cuenta Bancaria
Campo	Descripción	Tipo
Numero_Cuenta	ID único	Texto/Numérico
Tipo_Cuenta	Tipo	Catálogo
ID_Titular	ID cliente	Texto
Saldo_Actual	Saldo	Decimal
Moneda	Moneda	Catálogo
Estado_Cuenta	Estado	Catálogo
Fecha_Apertura	Fecha	Fecha
Préstamo / Crédito
Campo	Descripción	Tipo
ID_Prestamo	ID	Entero
Tipo_Prestamo	Tipo	Catálogo
ID_Cliente_Solicitante	Cliente	Texto
Monto_Solicitado	Monto	Decimal
Monto_Aprobado	Monto	Decimal
Tasa_Interes	Tasa	Decimal
Plazo_Meses	Plazo	Entero
Estado_Prestamo	Estado	Catálogo
Fecha_Aprobacion	Fecha	Fecha
Fecha_Desembolso	Fecha	Fecha
Cuenta_Destino_Desembolso	Cuenta	Texto
Transferencia
Campo	Descripción	Tipo
ID_Transferencia	ID	Entero
Cuenta_Origen	Origen	Texto
Cuenta_Destino	Destino	Texto
Monto	Valor	Decimal
Fecha_Creacion	Fecha	Fecha/Hora
Fecha_Aprobacion	Fecha	Fecha/Hora
Estado_Transferencia	Estado	Catálogo
ID_Usuario_Creador	Usuario	Entero
ID_Usuario_Aprobador	Usuario	Entero
Producto Bancario General
Campo	Descripción	Tipo
Codigo_Producto	Código	Texto
Nombre_Producto	Nombre	Texto
Categoria	Categoría	Catálogo
Requiere_Aprobacion	Booleano	Booleano
Flujos de Aprobación
Principio General

Toda operación debe registrar:

Quién la creó
Cuándo
Quién la aprobó/rechazó
Cuándo
Flujo de Préstamos
Solicitud
Estado: "En estudio"
Analista:
Aprobado → "Aprobado"
Rechazado → "Rechazado"
Desembolso:
Validar cuenta
Aumentar saldo
Registrar en bitácora
Flujo de Transferencias Empresariales
Creación
Si supera umbral:
"En espera de aprobación"
Supervisor:
Aprueba:
Validar saldo
Ejecutar
Registrar
Rechaza:
"Rechazada"
Vencimiento:

60 minutos → "Vencida"

Registrar evento
Bitácora de Operaciones (NoSQL)
Propósito

Auditoría y trazabilidad.

Campos
Campo	Descripción	Tipo
ID_Bitacora	ID	Texto
Tipo_Operacion	Tipo	Texto
Fecha_Hora_Operacion	Fecha	Fecha/Hora
ID_Usuario	Usuario	Entero
Rol_Usuario	Rol	Texto
ID_Producto_Afectado	Producto	Texto
Datos_Detalle	Datos	JSON
Ejemplos
Transferencia:
Saldos antes/después
Préstamo:
Estado anterior/nuevo
Vencimiento:
Motivo
Reglas de Negocio
Generales
Identificación única
No cuentas a usuarios inactivos
No operaciones en cuentas bloqueadas
Préstamos
Cliente válido
Transiciones:
En estudio → Aprobado/Rechazado
Desembolso:
Cuenta válida
Monto > 0
Actualiza saldo
Registra bitácora
Transferencias
ID único
Monto > 0
Validar saldo
No cuentas bloqueadas
Vencimiento automático
Impacto Financiero
Restar origen
Sumar destino
Registrar en BD y bitácora
Restricciones por Rol
Clientes
Solo sus productos
No ven otros clientes
Empleado Ventanilla
Consulta saldos
No ve riesgos
Empleado Comercial
Gestiona clientes
No modifica saldos
Empleado Empresa
Solo su empresa
Puede crear transferencias
Supervisor Empresa
Aprueba transferencias
Analista Interno
Control total de préstamos
Acceso completo a bitácora
No modifica saldos arbitrariamente
Conclusiones

El desarrollo requiere:

Modelado relacional (SQL)
Diseño NoSQL (bitácora)
Implementación de reglas de negocio
Control de accesos por rol

El éxito depende de:

Correcta implementación de flujos
Validaciones
Seguridad
Consistencia del sistema