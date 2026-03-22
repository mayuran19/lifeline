package com.lifelinecalllog.config;

import javax.sql.DataSource;
import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.impl.DefaultConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JooqConfig {

  @Bean
  public DSLContext dslContext(DataSource dataSource) {
    DefaultConfiguration config = new DefaultConfiguration();
    config.setDataSource(new UserAwareDataSource(dataSource));
    config.setSQLDialect(SQLDialect.POSTGRES);
    return DSL.using(config);
  }
}
