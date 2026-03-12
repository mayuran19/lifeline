package com.lifelinecalllog.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards all non-API routes to index.html for React client-side routing.
 * Must come after Spring Security permits the path.
 */
@Controller
public class SpaController {

    @GetMapping(value = {
            "/{path:^(?!api$).*$}",
            "/**/{path:^(?!api$).*$}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
