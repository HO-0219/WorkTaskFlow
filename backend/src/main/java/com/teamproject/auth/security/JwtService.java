package com.teamproject.auth.security;

import com.teamproject.auth.user.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtService {
    private final SecretKey key;
    private final long accessSeconds;

    public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.access-seconds}") long accessSeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessSeconds = accessSeconds;
    }
    public String create(User user) {
        Instant now = Instant.now();
        return Jwts.builder().subject(user.getId().toString())
                .claim("username", user.getUsername()).claim("role", user.getRole().name())
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(accessSeconds)))
                .signWith(key).compact();
    }
    public Claims parse(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); }
    public long accessSeconds() { return accessSeconds; }
}

