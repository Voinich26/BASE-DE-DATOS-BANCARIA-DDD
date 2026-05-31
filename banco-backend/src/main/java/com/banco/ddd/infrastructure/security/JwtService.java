package com.banco.ddd.infrastructure.security;

import com.banco.ddd.infrastructure.adapter.out.persistence.TokenRevocadoRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Servicio centralizado para generación y validación de tokens JWT.
 *
 * <p>Características enterprise:</p>
 * <ul>
 *   <li>JJWT 0.12.x con firma HMAC-SHA256</li>
 *   <li>JTI (JWT ID) único por token para revocación granular</li>
 *   <li>Claims enriquecidos (rol, idUsuario, nombre)</li>
 *   <li>Verificación contra blacklist de tokens revocados</li>
 *   <li>Distinción entre access token y refresh token</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties           jwtProperties;
    private final TokenRevocadoRepository tokenRevocadoRepository;

    // ── Token generation ─────────────────────────────────────────────────────

    /**
     * Genera un access token con claims básicos del usuario.
     */
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    /**
     * Genera un access token con claims adicionales (rol, idUsuario, etc.).
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtProperties.getExpirationMs(), "ACCESS");
    }

    /**
     * Genera un refresh token de larga duración.
     * No incluye claims de rol para minimizar el payload.
     */
    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(new HashMap<>(), userDetails,
                jwtProperties.getRefreshExpirationMs(), "REFRESH");
    }

    private String buildToken(Map<String, Object> extraClaims,
                               UserDetails userDetails,
                               long expirationMs,
                               String tokenType) {
        String jti = UUID.randomUUID().toString();

        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuer(jwtProperties.getIssuer())
                .id(jti)                                          // JTI para revocación
                .claim("type", tokenType)                         // Tipo de token
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    // ── Token validation ─────────────────────────────────────────────────────

    /**
     * Valida el token verificando: firma, expiración, username y blacklist.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            final String jti      = extractJti(token);

            // Verificar blacklist de tokens revocados
            if (tokenRevocadoRepository.existsByJti(jti)) {
                log.debug("Token revocado detectado — jti={}", jti);
                return false;
            }

            return username.equals(userDetails.getUsername()) && !isTokenExpired(token);

        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Verifica si el token ha expirado.
     */
    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // ── Claims extraction ────────────────────────────────────────────────────

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extrae el JTI (JWT ID) del token para operaciones de revocación.
     */
    public String extractJti(String token) {
        return extractClaim(token, Claims::getId);
    }

    /**
     * Extrae el tipo de token (ACCESS o REFRESH).
     */
    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get("type", String.class));
    }

    /**
     * Extrae el rol del usuario desde los claims del token.
     */
    public String extractRol(String token) {
        return extractClaim(token, claims -> claims.get("rol", String.class));
    }

    /**
     * Extrae el ID del usuario desde los claims del token.
     */
    public Long extractIdUsuario(String token) {
        return extractClaim(token, claims -> {
            Object id = claims.get("idUsuario");
            if (id instanceof Integer i) return i.longValue();
            if (id instanceof Long l)    return l;
            return null;
        });
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
