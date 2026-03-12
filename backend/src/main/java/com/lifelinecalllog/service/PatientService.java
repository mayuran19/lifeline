package com.lifelinecalllog.service;

import com.lifelinecalllog.dto.PatientRequest;
import com.lifelinecalllog.dto.PatientResponse;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

import static com.lifelinecalllog.jooq.Tables.PATIENT;

@Service
public class PatientService {

    private final DSLContext dsl;

    public PatientService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<PatientResponse> findAll(boolean activeOnly, String search) {
        Condition condition = DSL.trueCondition();
        if (activeOnly) condition = condition.and(PATIENT.ACTIVE.isTrue());
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase() + "%";
            condition = condition.and(
                    PATIENT.FIRST_NAME.lower().like(pattern)
                            .or(PATIENT.LAST_NAME.lower().like(pattern))
            );
        }
        return dsl.selectFrom(PATIENT)
                .where(condition)
                .orderBy(PATIENT.LAST_NAME, PATIENT.FIRST_NAME)
                .fetch(this::toResponse);
    }

    public PatientResponse findById(UUID id) {
        return dsl.selectFrom(PATIENT)
                .where(PATIENT.ID.eq(id))
                .fetchOptional(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + id));
    }

    public PatientResponse create(PatientRequest req) {
        var record = dsl.newRecord(PATIENT);
        record.setFirstName(req.firstName());
        record.setLastName(req.lastName());
        record.setDateOfBirth(req.dateOfBirth());
        record.setPhone(req.phone());
        record.setActive(true);
        record.store();
        return findById(record.getId());
    }

    public PatientResponse update(UUID id, PatientRequest req) {
        var record = dsl.selectFrom(PATIENT)
                .where(PATIENT.ID.eq(id))
                .fetchOptional()
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + id));
        record.setFirstName(req.firstName());
        record.setLastName(req.lastName());
        record.setDateOfBirth(req.dateOfBirth());
        record.setPhone(req.phone());
        record.store();
        return findById(record.getId());
    }

    public void deactivate(UUID id) {
        int updated = dsl.update(PATIENT)
                .set(PATIENT.ACTIVE, false)
                .where(PATIENT.ID.eq(id))
                .execute();
        if (updated == 0) throw new IllegalArgumentException("Patient not found: " + id);
    }

    private PatientResponse toResponse(org.jooq.Record r) {
        return new PatientResponse(
                r.get(PATIENT.ID),
                r.get(PATIENT.FIRST_NAME),
                r.get(PATIENT.LAST_NAME),
                r.get(PATIENT.DATE_OF_BIRTH),
                r.get(PATIENT.PHONE),
                r.get(PATIENT.ACTIVE),
                r.get(PATIENT.CREATED_DATE),
                r.get(PATIENT.CREATED_BY),
                r.get(PATIENT.LAST_MODIFIED_DATE),
                r.get(PATIENT.LAST_MODIFIED_BY),
                r.get(PATIENT.VERSION)
        );
    }
}
