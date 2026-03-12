package com.lifelinecalllog.service;

import com.lifelinecalllog.dto.DoctorRequest;
import com.lifelinecalllog.dto.DoctorResponse;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

import static com.lifelinecalllog.jooq.Tables.DOCTOR;

@Service
public class DoctorService {

    private final DSLContext dsl;

    public DoctorService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<DoctorResponse> findAll(boolean activeOnly) {
        Condition condition = activeOnly ? DOCTOR.ACTIVE.isTrue() : DSL.trueCondition();
        return dsl.selectFrom(DOCTOR)
                .where(condition)
                .orderBy(DOCTOR.LAST_NAME, DOCTOR.FIRST_NAME)
                .fetch(this::toResponse);
    }

    public DoctorResponse findById(UUID id) {
        return dsl.selectFrom(DOCTOR)
                .where(DOCTOR.ID.eq(id))
                .fetchOptional(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found: " + id));
    }

    public DoctorResponse create(DoctorRequest req) {
        var record = dsl.newRecord(DOCTOR);
        record.setFirstName(req.firstName());
        record.setLastName(req.lastName());
        record.setProviderNumber(req.providerNumber());
        record.setPhone(req.phone());
        record.setEmail(req.email());
        record.setActive(true);
        record.store();
        return findById(record.getId());
    }

    public DoctorResponse update(UUID id, DoctorRequest req) {
        var record = dsl.selectFrom(DOCTOR)
                .where(DOCTOR.ID.eq(id))
                .fetchOptional()
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found: " + id));
        record.setFirstName(req.firstName());
        record.setLastName(req.lastName());
        record.setProviderNumber(req.providerNumber());
        record.setPhone(req.phone());
        record.setEmail(req.email());
        record.store();
        return findById(record.getId());
    }

    public void deactivate(UUID id) {
        int updated = dsl.update(DOCTOR)
                .set(DOCTOR.ACTIVE, false)
                .where(DOCTOR.ID.eq(id))
                .execute();
        if (updated == 0) throw new IllegalArgumentException("Doctor not found: " + id);
    }

    private DoctorResponse toResponse(org.jooq.Record r) {
        return new DoctorResponse(
                r.get(DOCTOR.ID),
                r.get(DOCTOR.FIRST_NAME),
                r.get(DOCTOR.LAST_NAME),
                r.get(DOCTOR.PROVIDER_NUMBER),
                r.get(DOCTOR.PHONE),
                r.get(DOCTOR.EMAIL),
                r.get(DOCTOR.ACTIVE),
                r.get(DOCTOR.CREATED_DATE),
                r.get(DOCTOR.CREATED_BY),
                r.get(DOCTOR.LAST_MODIFIED_DATE),
                r.get(DOCTOR.LAST_MODIFIED_BY),
                r.get(DOCTOR.VERSION)
        );
    }
}
