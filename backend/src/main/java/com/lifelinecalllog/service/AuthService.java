package com.lifelinecalllog.service;

import com.lifelinecalllog.dto.AuthResponse;
import com.lifelinecalllog.dto.LoginRequest;
import com.lifelinecalllog.dto.RegisterRequest;
import com.lifelinecalllog.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${cookie.domain}")
    private String cookieDomain;

    @Value("${cookie.secure}")
    private boolean cookieSecure;

    @Value("${cookie.http-only}")
    private boolean cookieHttpOnly;

    @Value("${jwt.access-token.expiration}")
    private Long accessTokenExpiration;

    @Value("${jwt.refresh-token.expiration}")
    private Long refreshTokenExpiration;

    /**
     * Register a new user
     * TODO: Implement with JOOQ after code generation
     */
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        // TODO: Implement user registration with JOOQ
        // 1. Check if username or email already exists
        // 2. Hash password
        // 3. Insert user into database
        // 4. Generate tokens
        // 5. Save refresh token to database
        // 6. Set cookies
        // 7. Return AuthResponse

        String hashedPassword = passwordEncoder.encode(request.password());

        // Placeholder implementation
        String accessToken = jwtUtil.generateAccessToken(request.username(), "USER");
        String refreshToken = jwtUtil.generateRefreshToken(request.username(), "USER");

        setAuthCookies(response, accessToken, refreshToken);

        return new AuthResponse(accessToken, refreshToken, request.username(), request.email(), "USER");
    }

    /**
     * Login user
     * TODO: Implement with JOOQ after code generation
     */
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        // TODO: Implement user login with JOOQ
        // 1. Find user by username and userType
        // 2. Verify password
        // 3. Generate tokens
        // 4. Save refresh token to database
        // 5. Set cookies
        // 6. Return AuthResponse

        String userType = request.userType() != null ? request.userType() : "USER";

        // Placeholder implementation
        String accessToken = jwtUtil.generateAccessToken(request.username(), userType);
        String refreshToken = jwtUtil.generateRefreshToken(request.username(), userType);

        setAuthCookies(response, accessToken, refreshToken);

        return new AuthResponse(accessToken, refreshToken, request.username(), "user@example.com", userType);
    }

    /**
     * Refresh access token
     * TODO: Implement with JOOQ after code generation
     */
    public AuthResponse refreshToken(String refreshToken, HttpServletResponse response) {
        // TODO: Implement token refresh with JOOQ
        // 1. Validate refresh token
        // 2. Check if token exists in database and not revoked
        // 3. Extract username and userType
        // 4. Generate new access token
        // 5. Set cookie
        // 6. Return AuthResponse

        String username = jwtUtil.extractUsername(refreshToken);
        String userType = jwtUtil.extractUserType(refreshToken);

        String newAccessToken = jwtUtil.generateAccessToken(username, userType);

        setAccessTokenCookie(response, newAccessToken);

        return new AuthResponse(newAccessToken, refreshToken, username, "user@example.com", userType);
    }

    /**
     * Logout user
     * TODO: Implement with JOOQ after code generation
     */
    public void logout(String refreshToken, HttpServletResponse response) {
        // TODO: Implement logout with JOOQ
        // 1. Revoke refresh token in database
        // 2. Clear cookies

        clearAuthCookies(response);
    }

    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        setAccessTokenCookie(response, accessToken);
        setRefreshTokenCookie(response, refreshToken);
    }

    private void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        Cookie cookie = new Cookie("accessToken", accessToken);
        cookie.setHttpOnly(cookieHttpOnly);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge((int) (accessTokenExpiration / 1000));
        response.addCookie(cookie);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(cookieHttpOnly);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge((int) (refreshTokenExpiration / 1000));
        response.addCookie(cookie);
    }

    private void clearAuthCookies(HttpServletResponse response) {
        Cookie accessTokenCookie = new Cookie("accessToken", null);
        accessTokenCookie.setMaxAge(0);
        accessTokenCookie.setPath("/");
        response.addCookie(accessTokenCookie);

        Cookie refreshTokenCookie = new Cookie("refreshToken", null);
        refreshTokenCookie.setMaxAge(0);
        refreshTokenCookie.setPath("/");
        response.addCookie(refreshTokenCookie);
    }
}
