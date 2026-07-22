package com.teamproject.authorization.config;

import com.teamproject.authentication.infrastructure.oauth.OAuth2SuccessHandler;
import com.teamproject.jwt.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.*;
import java.util.List;

@Configuration
public class SecurityConfig {
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter,
            OAuth2SuccessHandler successHandler, @Value("${app.frontend-url}") String frontendUrl) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfiguration(frontendUrl)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .exceptionHandling(exceptions -> exceptions.defaultAuthenticationEntryPointFor((request, response, exception) -> {
                    response.setStatus(org.springframework.http.HttpStatus.UNAUTHORIZED.value());
                    response.setContentType(org.springframework.http.MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name());
                    response.getWriter().write("{\"code\":\"AUTHENTICATION_REQUIRED\",\"message\":\"로그인이 필요합니다.\",\"fieldErrors\":null}");
                }, new AntPathRequestMatcher("/api/**")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/health", "/api/v1/auth/providers").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/auth/email-verifications/**",
                                "/api/v1/auth/signup",
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/logout",
                                "/api/v1/auth/username-reminders",
                                "/api/v1/auth/password-resets/**").permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2Login(oauth -> oauth.successHandler(successHandler)
                        .failureHandler((request, response, exception) -> response.sendRedirect(frontendUrl + "/login?socialError=SOCIAL_LOGIN_FAILED")))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    private CorsConfigurationSource corsConfiguration(String frontendUrl) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
