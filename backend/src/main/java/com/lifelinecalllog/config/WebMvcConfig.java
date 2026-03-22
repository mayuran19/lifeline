package com.lifelinecalllog.config;

import java.io.IOException;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  /**
   * Serves static files from classpath:/static/. Falls back to index.html for any path not found —
   * this supports React client-side routing. Using ResourceHandlerRegistry avoids forwarding (which
   * caused infinite dispatch loops). API controllers (@RequestMapping) have higher handler priority
   * and are matched first, so /api/** routes are never intercepted here.
   */
  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry
        .addResourceHandler("/**")
        .addResourceLocations("classpath:/static/")
        .resourceChain(true)
        .addResolver(
            new PathResourceResolver() {
              @Override
              protected Resource getResource(String resourcePath, Resource location)
                  throws IOException {
                Resource resource = location.createRelative(resourcePath);
                if (resource.exists() && resource.isReadable()) {
                  return resource;
                }
                return new ClassPathResource("/static/index.html");
              }
            });
  }
}
