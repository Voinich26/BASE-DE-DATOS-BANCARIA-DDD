package com.banco.ddd.infrastructure.config;

import com.banco.ddd.domain.model.CredencialUsuario;
import com.banco.ddd.domain.model.Usuario;
import com.banco.ddd.infrastructure.adapter.out.persistence.CredencialUsuarioRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementación de UserDetailsService.
 * Carga el usuario desde `usuario` y su contraseña desde `credencial_usuario`.
 * Spring Security usa el correo electrónico como username.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository          usuarioRepository;
    private final CredencialUsuarioRepository credencialRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String correoElectronico)
            throws UsernameNotFoundException {

        Usuario usuario = usuarioRepository.findByCorreoWithRol(correoElectronico)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado: " + correoElectronico));

        // Cargar contraseña hasheada desde tabla separada
        CredencialUsuario credencial = credencialRepository.findByCorreo(correoElectronico)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Credenciales no configuradas para: " + correoElectronico));

        // Inyectar el hash en el campo transitorio del UserDetails
        usuario.setPassword(credencial.getPasswordHash());

        log.debug("UserDetails cargado para: {} rol: {}",
                correoElectronico, usuario.getRol().getNombreRol());

        return usuario;
    }
}
