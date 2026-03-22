package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.*;

import com.lifelinecalllog.dto.DoctorClinicDto;
import com.lifelinecalllog.dto.DoctorClinicRequest;
import com.lifelinecalllog.dto.DoctorRequest;
import com.lifelinecalllog.dto.DoctorResponse;
import java.util.List;
import java.util.UUID;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
        .fetch(r -> toResponse(r.getId()));
  }

  public DoctorResponse findById(UUID id) {
    if (!dsl.fetchExists(dsl.selectFrom(DOCTOR).where(DOCTOR.ID.eq(id)))) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found");
    }
    return toResponse(id);
  }

  @Transactional
  public DoctorResponse create(DoctorRequest req) {
    var record = dsl.newRecord(DOCTOR);
    mapFields(record, req);
    record.setActive(true);
    record.store();
    return toResponse(record.getId());
  }

  @Transactional
  public DoctorResponse update(UUID id, DoctorRequest req) {
    var record =
        dsl.selectFrom(DOCTOR)
            .where(DOCTOR.ID.eq(id))
            .fetchOptional()
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));
    mapFields(record, req);
    record.store();
    return toResponse(id);
  }

  public void deactivate(UUID id) {
    int updated = dsl.update(DOCTOR).set(DOCTOR.ACTIVE, false).where(DOCTOR.ID.eq(id)).execute();
    if (updated == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found");
  }

  // ── Clinic associations ────────────────────────────────────────────────────

  @Transactional
  public DoctorResponse addClinic(UUID doctorId, DoctorClinicRequest req) {
    if (!dsl.fetchExists(dsl.selectFrom(DOCTOR).where(DOCTOR.ID.eq(doctorId)))) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found");
    }
    // Check for duplicate active association
    boolean exists =
        dsl.fetchExists(
            dsl.selectFrom(DOCTOR_CLINIC)
                .where(
                    DOCTOR_CLINIC
                        .DOCTOR_ID
                        .eq(doctorId)
                        .and(DOCTOR_CLINIC.CLINIC_ID.eq(req.clinicId()))
                        .and(
                            req.clinicLocationId() == null
                                ? DOCTOR_CLINIC.CLINIC_LOCATION_ID.isNull()
                                : DOCTOR_CLINIC.CLINIC_LOCATION_ID.eq(req.clinicLocationId()))
                        .and(DOCTOR_CLINIC.ACTIVE.isTrue())));
    if (exists)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Association already exists");

    var assoc = dsl.newRecord(DOCTOR_CLINIC);
    assoc.setDoctorId(doctorId);
    assoc.setClinicId(req.clinicId());
    assoc.setClinicLocationId(req.clinicLocationId());
    assoc.setActive(true);
    assoc.store();
    return toResponse(doctorId);
  }

  @Transactional
  public DoctorResponse removeClinic(UUID doctorId, UUID associationId) {
    int updated =
        dsl.update(DOCTOR_CLINIC)
            .set(DOCTOR_CLINIC.ACTIVE, false)
            .where(DOCTOR_CLINIC.ID.eq(associationId).and(DOCTOR_CLINIC.DOCTOR_ID.eq(doctorId)))
            .execute();
    if (updated == 0)
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Association not found");
    return toResponse(doctorId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private void mapFields(
      com.lifelinecalllog.jooq.tables.records.DoctorRecord record, DoctorRequest req) {
    record.setFirstName(req.firstName());
    record.setLastName(req.lastName());
    record.setProviderNumber(req.providerNumber());
    record.setPrescriberNo(req.prescriberNo());
    record.setPhone(req.phone());
    record.setEmail(req.email());
  }

  private DoctorResponse toResponse(UUID doctorId) {
    var d = dsl.selectFrom(DOCTOR).where(DOCTOR.ID.eq(doctorId)).fetchOne();
    if (d == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found");

    List<DoctorClinicDto> clinics =
        dsl.selectFrom(DOCTOR_CLINIC)
            .where(DOCTOR_CLINIC.DOCTOR_ID.eq(doctorId))
            .orderBy(DOCTOR_CLINIC.CREATED_DATE.asc())
            .fetch(
                assoc -> {
                  UUID clinicId = assoc.getClinicId();
                  String clinicName = null;
                  var clinic = dsl.selectFrom(CLINIC).where(CLINIC.ID.eq(clinicId)).fetchOne();
                  if (clinic != null) clinicName = clinic.getName();

                  UUID locId = assoc.getClinicLocationId();
                  String locName = null, locAddress = null;
                  if (locId != null) {
                    var loc =
                        dsl.selectFrom(CLINIC_LOCATION)
                            .where(CLINIC_LOCATION.ID.eq(locId))
                            .fetchOne();
                    if (loc != null) {
                      locName = loc.getName();
                      locAddress =
                          loc.getFormattedAddress() != null
                              ? loc.getFormattedAddress()
                              : String.join(
                                  ", ",
                                  nonNull(loc.getSuburb(), loc.getState(), loc.getPostcode()));
                    }
                  }
                  return new DoctorClinicDto(
                      assoc.getId(),
                      clinicId,
                      clinicName,
                      locId,
                      locName,
                      locAddress,
                      assoc.getActive());
                });

    return new DoctorResponse(
        d.getId(),
        d.getFirstName(),
        d.getLastName(),
        d.getProviderNumber(),
        d.getPrescriberNo(),
        d.getPhone(),
        d.getEmail(),
        d.getActive(),
        clinics,
        d.getCreatedDate(),
        d.getCreatedBy(),
        d.getLastModifiedDate(),
        d.getLastModifiedBy(),
        d.getVersion());
  }

  private List<String> nonNull(String... values) {
    return java.util.Arrays.stream(values).filter(v -> v != null && !v.isBlank()).toList();
  }
}
