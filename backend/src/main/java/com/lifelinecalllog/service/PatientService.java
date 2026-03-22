package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.*;

import com.lifelinecalllog.dto.PageResponse;
import com.lifelinecalllog.dto.PatientRequest;
import com.lifelinecalllog.dto.PatientResponse;
import com.lifelinecalllog.jooq.enums.PatientStatus;
import java.util.List;
import java.util.UUID;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.SortField;
import org.jooq.impl.DSL;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PatientService {

  private final DSLContext dsl;

  public PatientService(DSLContext dsl) {
    this.dsl = dsl;
  }

  public PageResponse<PatientResponse> findAll(
      boolean activeOnly, String search, String sortBy, String sortDir, int page, int size) {
    Condition condition = DSL.trueCondition();
    if (activeOnly) condition = condition.and(PATIENT.STATUS.eq(PatientStatus.ACTIVE));
    if (search != null && !search.isBlank()) {
      String pattern = "%" + search.toLowerCase() + "%";
      condition =
          condition.and(
              PATIENT.FIRST_NAME.lower().like(pattern).or(PATIENT.LAST_NAME.lower().like(pattern)));
    }

    SortField<?> order = resolveSort(sortBy, sortDir);
    long total = dsl.fetchCount(dsl.selectFrom(PATIENT).where(condition));
    int totalPages = (int) Math.ceil((double) total / size);

    List<PatientResponse> content =
        dsl.selectFrom(PATIENT)
            .where(condition)
            .orderBy(order)
            .limit(size)
            .offset((long) page * size)
            .fetch(r -> toResponse(r.getId()));

    return new PageResponse<>(content, page, size, total, totalPages);
  }

  // @formatter:off
  private SortField<?> resolveSort(String sortBy, String sortDir) {
    boolean asc = !"desc".equalsIgnoreCase(sortDir);
    return switch (sortBy == null ? "" : sortBy) {
      case "firstName" -> asc ? PATIENT.FIRST_NAME.asc() : PATIENT.FIRST_NAME.desc();
      case "status" -> asc ? PATIENT.STATUS.asc() : PATIENT.STATUS.desc();
      default -> asc ? PATIENT.LAST_NAME.asc().nullsLast() : PATIENT.LAST_NAME.desc().nullsLast();
    };
  }

  // @formatter:on

  public List<PatientResponse> findAllForSearch(boolean activeOnly, String search) {
    Condition condition = DSL.trueCondition();
    if (activeOnly) condition = condition.and(PATIENT.STATUS.eq(PatientStatus.ACTIVE));
    if (search != null && !search.isBlank()) {
      String pattern = "%" + search.toLowerCase() + "%";
      condition =
          condition.and(
              PATIENT.FIRST_NAME.lower().like(pattern).or(PATIENT.LAST_NAME.lower().like(pattern)));
    }
    return dsl.selectFrom(PATIENT)
        .where(condition)
        .orderBy(PATIENT.LAST_NAME, PATIENT.FIRST_NAME)
        .limit(20)
        .fetch(r -> toResponse(r.getId()));
  }

  public PatientResponse findById(UUID id) {
    if (!dsl.fetchExists(dsl.selectFrom(PATIENT).where(PATIENT.ID.eq(id)))) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found");
    }
    return toResponse(id);
  }

  @Transactional
  public PatientResponse create(PatientRequest req) {
    var record = dsl.newRecord(PATIENT);
    mapFields(record, req);
    record.setStatus(PatientStatus.ACTIVE);
    record.store();
    saveClinicAssociation(record.getId(), req.clinicId(), req.clinicLocationId());
    return toResponse(record.getId());
  }

  @Transactional
  public PatientResponse update(UUID id, PatientRequest req) {
    var record =
        dsl.selectFrom(PATIENT)
            .where(PATIENT.ID.eq(id))
            .fetchOptional()
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found"));
    mapFields(record, req);
    record.store();

    // Replace current clinic association
    dsl.update(PATIENT_CLINIC)
        .set(PATIENT_CLINIC.IS_CURRENT, false)
        .where(PATIENT_CLINIC.PATIENT_ID.eq(id).and(PATIENT_CLINIC.IS_CURRENT.isTrue()))
        .execute();
    saveClinicAssociation(id, req.clinicId(), req.clinicLocationId());

    return toResponse(id);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private void mapFields(
      com.lifelinecalllog.jooq.tables.records.PatientRecord record, PatientRequest req) {
    record.setFirstName(req.firstName());
    record.setLastName(req.lastName());
    record.setDateOfBirth(req.dateOfBirth());
    record.setPhone(req.phone());
    record.setMedicareNo(req.medicareNo());
    record.setIrnNo(req.irnNo());
    record.setRemark(req.remark());
    record.setStatusReason(req.statusReason());
    record.setDeceasedDate(req.deceasedDate());
    if (req.status() != null) {
      record.setStatus(PatientStatus.valueOf(req.status()));
    }
  }

  private void saveClinicAssociation(UUID patientId, UUID clinicId, UUID clinicLocationId) {
    if (clinicId == null) return;
    var assoc = dsl.newRecord(PATIENT_CLINIC);
    assoc.setPatientId(patientId);
    assoc.setClinicId(clinicId);
    assoc.setClinicLocationId(clinicLocationId);
    assoc.setIsCurrent(true);
    assoc.store();
  }

  private PatientResponse toResponse(UUID patientId) {
    var p = dsl.selectFrom(PATIENT).where(PATIENT.ID.eq(patientId)).fetchOne();
    if (p == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found");

    var assoc =
        dsl.selectFrom(PATIENT_CLINIC)
            .where(PATIENT_CLINIC.PATIENT_ID.eq(patientId).and(PATIENT_CLINIC.IS_CURRENT.isTrue()))
            .orderBy(PATIENT_CLINIC.CREATED_DATE.desc())
            .limit(1)
            .fetchOne();

    UUID clinicId = null;
    String clinicName = null;
    UUID clinicLocationId = null;
    String clinicLocationName = null;
    String clinicLocationAddress = null;

    if (assoc != null) {
      clinicId = assoc.getClinicId();
      var clinic = dsl.selectFrom(CLINIC).where(CLINIC.ID.eq(clinicId)).fetchOne();
      if (clinic != null) clinicName = clinic.getName();

      clinicLocationId = assoc.getClinicLocationId();
      if (clinicLocationId != null) {
        var loc =
            dsl.selectFrom(CLINIC_LOCATION)
                .where(CLINIC_LOCATION.ID.eq(clinicLocationId))
                .fetchOne();
        if (loc != null) {
          clinicLocationName = loc.getName();
          clinicLocationAddress =
              loc.getFormattedAddress() != null
                  ? loc.getFormattedAddress()
                  : String.join(", ", nonNull(loc.getSuburb(), loc.getState(), loc.getPostcode()));
        }
      }
    }

    return new PatientResponse(
        p.getId(),
        p.getFirstName(),
        p.getLastName(),
        p.getDateOfBirth(),
        p.getPhone(),
        p.getMedicareNo(),
        p.getIrnNo(),
        p.getRemark(),
        p.getStatus() != null ? p.getStatus().getLiteral() : "ACTIVE",
        p.getStatusReason(),
        p.getDeceasedDate(),
        clinicId,
        clinicName,
        clinicLocationId,
        clinicLocationName,
        clinicLocationAddress,
        p.getCreatedDate(),
        p.getCreatedBy(),
        p.getLastModifiedDate(),
        p.getLastModifiedBy(),
        p.getVersion());
  }

  private List<String> nonNull(String... values) {
    return java.util.Arrays.stream(values).filter(v -> v != null && !v.isBlank()).toList();
  }
}
