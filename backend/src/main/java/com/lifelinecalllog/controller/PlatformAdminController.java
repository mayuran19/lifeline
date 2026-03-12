package com.lifelinecalllog.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class PlatformAdminController {

    @GetMapping("/users")
    public ResponseEntity<Map<String, String>> getAllUsers(Authentication authentication) {
        // TODO: Implement with JOOQ - fetch all users
        return ResponseEntity.ok(Map.of("message", "Get all users endpoint - TODO: implement with JOOQ"));
    }

    // Add your platform admin endpoints here
}
