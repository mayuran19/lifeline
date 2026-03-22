package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.CONFIGURATION;

import com.lifelinecalllog.dto.ConfigurationCreateRequest;
import com.lifelinecalllog.dto.ConfigurationResponse;
import com.lifelinecalllog.dto.ConfigurationUpdateRequest;
import java.util.List;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfigurationService {

  private final DSLContext dsl;

  public ConfigurationService(DSLContext dsl) {
    this.dsl = dsl;
  }

  public List<ConfigurationResponse> findAll(String configGroup) {
    Condition condition = DSL.trueCondition();
    if (configGroup != null && !configGroup.isBlank()) {
      condition = condition.and(CONFIGURATION.CONFIG_GROUP.eq(configGroup));
    }
    return dsl.selectFrom(CONFIGURATION)
        .where(condition)
        .orderBy(CONFIGURATION.GROUP_DISPLAY_ORDER, CONFIGURATION.CONFIG_DISPLAY_ORDER)
        .fetch(
            r ->
                new ConfigurationResponse(
                    r.getConfigGroup(),
                    r.getGroupDisplayOrder(),
                    r.getConfigKey(),
                    r.getConfigDescription(),
                    r.getConfigDisplayOrder(),
                    r.getStatus(),
                    r.getCreatedDate(),
                    r.getCreatedBy(),
                    r.getLastModifiedDate(),
                    r.getLastModifiedBy(),
                    r.getVersion()));
  }

  @Transactional
  public ConfigurationResponse create(ConfigurationCreateRequest req) {
    boolean exists =
        dsl.fetchExists(
            dsl.selectFrom(CONFIGURATION)
                .where(
                    CONFIGURATION
                        .CONFIG_GROUP
                        .eq(req.configGroup())
                        .and(CONFIGURATION.CONFIG_KEY.eq(req.configKey()))));
    if (exists) {
      throw new IllegalStateException(
          "Configuration key '"
              + req.configKey()
              + "' already exists in group '"
              + req.configGroup()
              + "'");
    }
    dsl.insertInto(
            CONFIGURATION,
            CONFIGURATION.CONFIG_GROUP,
            CONFIGURATION.GROUP_DISPLAY_ORDER,
            CONFIGURATION.CONFIG_KEY,
            CONFIGURATION.CONFIG_DESCRIPTION,
            CONFIGURATION.CONFIG_DISPLAY_ORDER,
            CONFIGURATION.STATUS)
        .values(
            req.configGroup(), req.groupDisplayOrder(),
            req.configKey(), req.configDescription(),
            req.configDisplayOrder(), "ACTIVE")
        .execute();
    return findByKey(req.configGroup(), req.configKey());
  }

  @Transactional
  public ConfigurationResponse update(
      String configGroup, String configKey, ConfigurationUpdateRequest req) {
    var record =
        dsl.selectFrom(CONFIGURATION)
            .where(
                CONFIGURATION
                    .CONFIG_GROUP
                    .eq(configGroup)
                    .and(CONFIGURATION.CONFIG_KEY.eq(configKey)))
            .fetchOptional()
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        "Configuration not found: " + configGroup + "/" + configKey));

    if (req.configDescription() != null) record.setConfigDescription(req.configDescription());
    if (req.configDisplayOrder() != null) record.setConfigDisplayOrder(req.configDisplayOrder());
    if (req.groupDisplayOrder() != null) record.setGroupDisplayOrder(req.groupDisplayOrder());
    if (req.status() != null) {
      if (!req.status().equals("ACTIVE") && !req.status().equals("INACTIVE")) {
        throw new IllegalArgumentException("Status must be ACTIVE or INACTIVE");
      }
      record.setStatus(req.status());
    }
    record.store();
    return findByKey(configGroup, configKey);
  }

  private ConfigurationResponse findByKey(String configGroup, String configKey) {
    return dsl.selectFrom(CONFIGURATION)
        .where(
            CONFIGURATION.CONFIG_GROUP.eq(configGroup).and(CONFIGURATION.CONFIG_KEY.eq(configKey)))
        .fetchOptional(
            r ->
                new ConfigurationResponse(
                    r.getConfigGroup(),
                    r.getGroupDisplayOrder(),
                    r.getConfigKey(),
                    r.getConfigDescription(),
                    r.getConfigDisplayOrder(),
                    r.getStatus(),
                    r.getCreatedDate(),
                    r.getCreatedBy(),
                    r.getLastModifiedDate(),
                    r.getLastModifiedBy(),
                    r.getVersion()))
        .orElseThrow(
            () ->
                new IllegalArgumentException(
                    "Configuration not found: " + configGroup + "/" + configKey));
  }

  public boolean isValidKey(String configGroup, String configKey) {
    return dsl.fetchExists(
        dsl.selectFrom(CONFIGURATION)
            .where(
                CONFIGURATION
                    .CONFIG_GROUP
                    .eq(configGroup)
                    .and(CONFIGURATION.CONFIG_KEY.eq(configKey))
                    .and(CONFIGURATION.STATUS.eq("ACTIVE"))));
  }
}
