package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * BC-06: Cola de auditoría — sincroniza con MongoDB.
 */
@Entity
@Table(name = "bitacora_cola")
@Getter @Setter @NoArgsConstructor
public class BitacolaCola {

    @Id
    @Column(name = "id_bitacora", length = 36)
    private String idBitacora;

    @Column(name = "tipo_operacion", nullable = false, length = 50)
    private String tipoOperacion;

    @Column(name = "fecha_hora_operacion", nullable = false)
    private LocalDateTime fechaHoraOperacion;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Column(name = "rol_usuario", nullable = false, length = 60)
    private String rolUsuario;

    @Column(name = "id_producto_afectado", nullable = false, length = 30)
    private String idProductoAfectado;

    @Column(name = "tipo_producto", nullable = false, length = 20)
    private String tipoProducto;

    @Column(name = "datos_detalle", nullable = false, columnDefinition = "JSON")
    private String datosDetalle;

    @Column(name = "sincronizado", nullable = false)
    private boolean sincronizado;
}
