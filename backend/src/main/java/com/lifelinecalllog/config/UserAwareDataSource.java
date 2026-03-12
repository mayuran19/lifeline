package com.lifelinecalllog.config;

import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * DataSource wrapper that sets app.current_user (as UUID) once per connection acquisition.
 * Looks up the authenticated user's UUID from app_user by username so audit triggers
 * record the user's ID rather than their username.
 */
public class UserAwareDataSource extends DelegatingDataSource {

    public UserAwareDataSource(DataSource delegate) {
        super(delegate);
    }

    @Override
    public Connection getConnection() throws SQLException {
        Connection connection = super.getConnection();
        applyCurrentUser(connection);
        return connection;
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        Connection connection = super.getConnection(username, password);
        applyCurrentUser(connection);
        return connection;
    }

    private void applyCurrentUser(Connection connection) throws SQLException {
        String username = resolveUsername();
        if (username == null) return;

        String userId = lookupUserId(connection, username);
        if (userId == null) return;

        try (PreparedStatement stmt = connection.prepareStatement(
                "SELECT set_config('app.current_user', ?, false)")) {
            stmt.setString(1, userId);
            stmt.execute();
        }
    }

    private String lookupUserId(Connection connection, String username) throws SQLException {
        try (PreparedStatement stmt = connection.prepareStatement(
                "SELECT id FROM app_user WHERE username = ?")) {
            stmt.setString(1, username);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString(1);
                }
            }
        }
        return null;
    }

    private String resolveUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        String name = auth.getName();
        if ("anonymousUser".equals(name)) return null;
        return name;
    }
}
