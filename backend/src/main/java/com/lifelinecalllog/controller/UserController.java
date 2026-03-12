package com.lifelinecalllog.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/doctor")
public class UserController {

    @GetMapping("/profile")
    public ResponseEntity<Map<String, String>> getProfile(Authentication authentication) {
        String username = authentication.getName();
        // TODO: Implement with JOOQ - fetch user profile
        return ResponseEntity.ok(Map.of(
            "username", username,
            "message", "User profile endpoint - TODO: implement with JOOQ"
        ));
    }

    // Add your user endpoints here
}
