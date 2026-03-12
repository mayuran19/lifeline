package com.lifelinecalllog.service;

import com.lifelinecalllog.dto.ClinicRequest;
import com.lifelinecalllog.dto.ClinicResponse;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

import static com.lifelinecalllog.jooq.Tables.CLINIC;

@Service
public class ClinicService {

    private final DSLContext dsl;

    public ClinicService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<ClinicResponse> findAll(boolean activeOnly) {
        Condition condition = activeOnly ? CLINIC.ACTIVE.isTrue() : DSL.trueCondition();
        return dsl.selectFrom(CLINIC)
                .where(condition)
                .orderBy(CLINIC.NAME)
                .fetch(this::toResponse);
    }

    public ClinicResponse findById(UUID id) {
        return dsl.selectFrom(CLINIC)
                .where(CLINIC.ID.eq(id))
                .fetchOptional(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("Clinic not found: " + id));
    }

    public ClinicResponse create(ClinicRequest req) {
        var record = dsl.newRecord(CLINIC);
        record.setName(req.name());
        record.setAddress(req.address());
        record.setPhone(req.phone());
        record.setFax(req.fax());
        record.setEmail(req.email());
        record.setActive(true);
        record.store();
        return findById(record.getId());
    }

    public ClinicResponse update(UUID id, ClinicRequest req) {
        var record = dsl.selectFrom(CLINIC)
                .where(CLINIC.ID.eq(id))
                .fetchOptional()
                .orElseThrow(() -> new IllegalArgumentException("Clinic not found: " + id));
        record.setName(req.name());
        record.setAddress(req.address());
        record.setPhone(req.phone());
        record.setFax(req.fax());
        record.setEmail(req.email());
        record.store();
        return findById(record.getId());
    }

    public void deactivate(UUID id) {
        int updated = dsl.update(CLINIC)
                .set(CLINIC.ACTIVE, false)
                .where(CLINIC.ID.eq(id))
                .execute();
        if (updated == 0) throw new IllegalArgumentException("Clinic not found: " + id);
    }

    private ClinicResponse toResponse(org.jooq.Record r) {
        return new ClinicResponse(
                r.get(CLINIC.ID),
                r.get(CLINIC.NAME),
                r.get(CLINIC.ADDRESS),
                r.get(CLINIC.PHONE),
                r.get(CLINIC.FAX),
                r.get(CLINIC.EMAIL),
                r.get(CLINIC.ACTIVE),
                r.get(CLINIC.CREATED_DATE),
                r.get(CLINIC.CREATED_BY),
                r.get(CLINIC.LAST_MODIFIED_DATE),
                r.get(CLINIC.LAST_MODIFIED_BY),
                r.get(CLINIC.VERSION)
        );
    }
}
