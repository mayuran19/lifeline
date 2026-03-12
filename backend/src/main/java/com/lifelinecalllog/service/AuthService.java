package com.lifelinecalllog.service;

import com.lifelinecalllog.dto.AuthResponse;
import com.lifelinecalllog.dto.LoginRequest;
import com.lifelinecalllog.jooq.tables.records.AppUserRecord;
import com.lifelinecalllog.security.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static com.lifelinecalllog.jooq.Tables.APP_USER;
import static com.lifelinecalllog.jooq.Tables.REFRESH_TOKEN;

@Service
public class AuthService {

    @Autowired
    private DSLContext dsl;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${cookie.secure}")
    private boolean cookieSecure;

    @Value("${cookie.http-only}")
    private boolean cookieHttpOnly;

    @Value("${jwt.access-token.expiration}")
    private Long accessTokenExpiration;

    @Value("${jwt.refresh-token.expiration}")
    private Long refreshTokenExpiration;

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        AppUserRecord user = dsl.selectFrom(APP_USER)
                .where(APP_USER.USERNAME.eq(request.username()))
                .fetchOne();

        if (user == null || !Boolean.TRUE.equals(user.getEnabled())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        String accessToken = jwtUtil.generateAccessToken(user.getUsername(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getUsername(), user.getRole());

        // Use explicit column INSERT to avoid stale jOOQ generated code issues after schema migration
        dsl.insertInto(REFRESH_TOKEN,
                        REFRESH_TOKEN.TOKEN, REFRESH_TOKEN.USER_ID, REFRESH_TOKEN.EXPIRY_DATE, REFRESH_TOKEN.REVOKED)
                .values(refreshToken, user.getId(),
                        OffsetDateTime.now().plusSeconds(refreshTokenExpiration / 1000), false)
                .execute();

        setAuthCookies(response, accessToken, refreshToken);

        return new AuthResponse(accessToken, refreshToken, user.getUsername(), user.getEmail(), user.getRole());
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenValue, HttpServletResponse response) {
        var tokenRow = dsl.select(REFRESH_TOKEN.REVOKED, REFRESH_TOKEN.EXPIRY_DATE)
                .from(REFRESH_TOKEN)
                .where(REFRESH_TOKEN.TOKEN.eq(refreshTokenValue))
                .fetchOne();

        if (tokenRow == null || Boolean.TRUE.equals(tokenRow.get(REFRESH_TOKEN.REVOKED))) {
            throw new BadCredentialsException("Invalid or revoked refresh token");
        }

        if (tokenRow.get(REFRESH_TOKEN.EXPIRY_DATE).isBefore(OffsetDateTime.now())) {
            throw new BadCredentialsException("Refresh token expired");
        }

        String username = jwtUtil.extractUsername(refreshTokenValue);
        AppUserRecord user = dsl.selectFrom(APP_USER)
                .where(APP_USER.USERNAME.eq(username))
                .fetchOne();

        if (user == null || !Boolean.TRUE.equals(user.getEnabled())) {
            throw new BadCredentialsException("User not found or disabled");
        }

        String newAccessToken = jwtUtil.generateAccessToken(user.getUsername(), user.getRole());
        setAccessTokenCookie(response, newAccessToken);

        return new AuthResponse(newAccessToken, refreshTokenValue, user.getUsername(), user.getEmail(), user.getRole());
    }

    @Transactional
    public void logout(String refreshTokenValue, HttpServletResponse response) {
        if (refreshTokenValue != null) {
            dsl.update(REFRESH_TOKEN)
                    .set(REFRESH_TOKEN.REVOKED, true)
                    .where(REFRESH_TOKEN.TOKEN.eq(refreshTokenValue))
                    .execute();
        }
        clearAuthCookies(response);
    }

    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        setAccessTokenCookie(response, accessToken);
        setRefreshTokenCookie(response, refreshToken);
    }

    private void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        addCookieHeader(response, "accessToken", accessToken, (int) (accessTokenExpiration / 1000));
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        addCookieHeader(response, "refreshToken", refreshToken, (int) (refreshTokenExpiration / 1000));
    }

    private void addCookieHeader(HttpServletResponse response, String name, String value, int maxAge) {
        StringBuilder sb = new StringBuilder();
        sb.append(name).append("=").append(value);
        sb.append("; Path=/");
        sb.append("; Max-Age=").append(maxAge);
        if (cookieHttpOnly) sb.append("; HttpOnly");
        if (cookieSecure) sb.append("; Secure");
        sb.append("; SameSite=Strict");
        response.addHeader("Set-Cookie", sb.toString());
    }

    private void clearAuthCookies(HttpServletResponse response) {
        response.addHeader("Set-Cookie", "accessToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict");
        response.addHeader("Set-Cookie", "refreshToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict");
    }
}
