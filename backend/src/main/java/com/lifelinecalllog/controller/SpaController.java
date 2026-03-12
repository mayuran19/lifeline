package com.lifelinecalllog.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards all non-API routes to index.html for React client-side routing.
 * Must come after Spring Security permits the path.
 */
@Controller
public class SpaController {

    @RequestMapping(value = "/{path:[^\\.]*}")
    public String forwardTopLevel(HttpServletRequest request) {
        return "forward:/index.html";
    }

    @RequestMapping(value = "/{path:[^\\.]*}/**")
    public String forwardNested(HttpServletRequest request) {
        return "forward:/index.html";
    }
}
