package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.*;

import com.lifelinecalllog.dto.*;
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
        .fetch(r -> toResponse(r.getId()));
  }

  public ClinicResponse findById(UUID id) {
    var record = dsl.selectFrom(CLINIC).where(CLINIC.ID.eq(id)).fetchOne();
    if (record == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Clinic not found");
    return toResponse(id);
  }

  @Transactional
  public ClinicResponse create(ClinicRequest req) {
    var record = dsl.newRecord(CLINIC);
    record.setName(req.name());
    record.setPhone(req.phone());
    record.setFax(req.fax());
    record.setActive(true);
    record.store();
    return toResponse(record.getId());
  }

  @Transactional
  public ClinicResponse update(UUID id, ClinicRequest req) {
    var record =
        dsl.selectFrom(CLINIC)
            .where(CLINIC.ID.eq(id))
            .fetchOptional()
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Clinic not found"));
    record.setName(req.name());
    record.setPhone(req.phone());
    record.setFax(req.fax());
    record.store();
    return toResponse(id);
  }

  @Transactional
  public void deactivate(UUID id) {
    int updated = dsl.update(CLINIC).set(CLINIC.ACTIVE, false).where(CLINIC.ID.eq(id)).execute();
    if (updated == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Clinic not found");
  }

  // ── Clinic emails ──────────────────────────────────────────────────────────

  @Transactional
  public ClinicEmailDto addEmail(UUID clinicId, ClinicEmailRequest req) {
    assertClinicExists(clinicId);
    if (req.primary()) clearPrimaryClinicEmail(clinicId);
    var record = dsl.newRecord(CLINIC_EMAIL);
    record.setClinicId(clinicId);
    record.setEmail(req.email());
    record.setLabel(req.label());
    record.setIsPrimary(req.primary());
    record.store();
    return toEmailDto(record.getId(), record.getEmail(), record.getLabel(), record.getIsPrimary());
  }

  @Transactional
  public ClinicEmailDto updateEmail(UUID clinicId, UUID emailId, ClinicEmailRequest req) {
    var record =
        dsl.selectFrom(CLINIC_EMAIL)
            .where(CLINIC_EMAIL.ID.eq(emailId).and(CLINIC_EMAIL.CLINIC_ID.eq(clinicId)))
            .fetchOptional()
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Email not found"));
    if (req.primary()) clearPrimaryClinicEmail(clinicId);
    record.setEmail(req.email());
    record.setLabel(req.label());
    record.setIsPrimary(req.primary());
    record.store();
    return toEmailDto(record.getId(), record.getEmail(), record.getLabel(), record.getIsPrimary());
  }

  @Transactional
  public void deleteEmail(UUID clinicId, UUID emailId) {
    int deleted =
        dsl.deleteFrom(CLINIC_EMAIL)
            .where(CLINIC_EMAIL.ID.eq(emailId).and(CLINIC_EMAIL.CLINIC_ID.eq(clinicId)))
            .execute();
    if (deleted == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Email not found");
  }

  // ── Clinic locations ───────────────────────────────────────────────────────

  @Transactional
  public ClinicLocationDto addLocation(UUID clinicId, ClinicLocationRequest req) {
    assertClinicExists(clinicId);
    if (req.primary()) clearPrimaryLocation(clinicId);
    var loc = dsl.newRecord(CLINIC_LOCATION);
    mapLocationFields(loc, clinicId, req);
    loc.store();
    saveLocationEmails(loc.getId(), req.emails());
    return toLocationDto(loc.getId());
  }

  @Transactional
  public ClinicLocationDto updateLocation(
      UUID clinicId, UUID locationId, ClinicLocationRequest req) {
    var loc =
        dsl.selectFrom(CLINIC_LOCATION)
            .where(CLINIC_LOCATION.ID.eq(locationId).and(CLINIC_LOCATION.CLINIC_ID.eq(clinicId)))
            .fetchOptional()
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found"));
    if (req.primary()) clearPrimaryLocation(clinicId);
    mapLocationFields(loc, clinicId, req);
    loc.store();
    // Replace all emails for this location
    dsl.deleteFrom(CLINIC_LOCATION_EMAIL)
        .where(CLINIC_LOCATION_EMAIL.CLINIC_LOCATION_ID.eq(locationId))
        .execute();
    saveLocationEmails(locationId, req.emails());
    return toLocationDto(locationId);
  }

  @Transactional
  public void deactivateLocation(UUID clinicId, UUID locationId) {
    int updated =
        dsl.update(CLINIC_LOCATION)
            .set(CLINIC_LOCATION.ACTIVE, false)
            .where(CLINIC_LOCATION.ID.eq(locationId).and(CLINIC_LOCATION.CLINIC_ID.eq(clinicId)))
            .execute();
    if (updated == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found");
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private ClinicResponse toResponse(UUID clinicId) {
    var r = dsl.selectFrom(CLINIC).where(CLINIC.ID.eq(clinicId)).fetchOne();
    if (r == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Clinic not found");

    List<ClinicEmailDto> emails =
        dsl.selectFrom(CLINIC_EMAIL)
            .where(CLINIC_EMAIL.CLINIC_ID.eq(clinicId))
            .orderBy(CLINIC_EMAIL.IS_PRIMARY.desc(), CLINIC_EMAIL.EMAIL.asc())
            .fetch(e -> toEmailDto(e.getId(), e.getEmail(), e.getLabel(), e.getIsPrimary()));

    List<ClinicLocationDto> locations =
        dsl.selectFrom(CLINIC_LOCATION)
            .where(CLINIC_LOCATION.CLINIC_ID.eq(clinicId))
            .orderBy(CLINIC_LOCATION.IS_PRIMARY.desc(), CLINIC_LOCATION.NAME.asc())
            .fetch(l -> toLocationDto(l.getId()));

    return new ClinicResponse(
        r.getId(),
        r.getName(),
        r.getPhone(),
        r.getFax(),
        r.getActive(),
        emails,
        locations,
        r.getCreatedDate(),
        r.getCreatedBy(),
        r.getLastModifiedDate(),
        r.getLastModifiedBy(),
        r.getVersion());
  }

  private ClinicLocationDto toLocationDto(UUID locationId) {
    var l = dsl.selectFrom(CLINIC_LOCATION).where(CLINIC_LOCATION.ID.eq(locationId)).fetchOne();
    if (l == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found");

    List<ClinicEmailDto> emails =
        dsl.selectFrom(CLINIC_LOCATION_EMAIL)
            .where(CLINIC_LOCATION_EMAIL.CLINIC_LOCATION_ID.eq(locationId))
            .orderBy(CLINIC_LOCATION_EMAIL.IS_PRIMARY.desc(), CLINIC_LOCATION_EMAIL.EMAIL.asc())
            .fetch(e -> toEmailDto(e.getId(), e.getEmail(), e.getLabel(), e.getIsPrimary()));

    return new ClinicLocationDto(
        l.getId(),
        l.getClinicId(),
        l.getName(),
        l.getAddressLine1(),
        l.getAddressLine2(),
        l.getSuburb(),
        l.getState(),
        l.getPostcode(),
        l.getLatitude(),
        l.getLongitude(),
        l.getPlaceId(),
        l.getFormattedAddress(),
        l.getManagerName(),
        l.getCareCoordinationName(),
        l.getPhone(),
        l.getFax(),
        Boolean.TRUE.equals(l.getIsPrimary()),
        Boolean.TRUE.equals(l.getActive()),
        emails);
  }

  private ClinicEmailDto toEmailDto(UUID id, String email, String label, Boolean isPrimary) {
    return new ClinicEmailDto(id, email, label, Boolean.TRUE.equals(isPrimary));
  }

  private void mapLocationFields(
      com.lifelinecalllog.jooq.tables.records.ClinicLocationRecord loc,
      UUID clinicId,
      ClinicLocationRequest req) {
    loc.setClinicId(clinicId);
    loc.setName(req.name());
    loc.setAddressLine1(req.addressLine1());
    loc.setAddressLine2(req.addressLine2());
    loc.setSuburb(req.suburb());
    loc.setState(req.state() != null ? req.state() : "VIC");
    loc.setPostcode(req.postcode());
    loc.setLatitude(req.latitude());
    loc.setLongitude(req.longitude());
    loc.setPlaceId(req.placeId());
    loc.setFormattedAddress(req.formattedAddress());
    loc.setManagerName(req.managerName());
    loc.setCareCoordinationName(req.careCoordinationName());
    loc.setPhone(req.phone());
    loc.setFax(req.fax());
    loc.setIsPrimary(req.primary());
    loc.setActive(true);
  }

  private void saveLocationEmails(UUID locationId, List<ClinicEmailRequest> emails) {
    if (emails == null || emails.isEmpty()) return;
    for (ClinicEmailRequest e : emails) {
      var record = dsl.newRecord(CLINIC_LOCATION_EMAIL);
      record.setClinicLocationId(locationId);
      record.setEmail(e.email());
      record.setLabel(e.label());
      record.setIsPrimary(e.primary());
      record.store();
    }
  }

  private void clearPrimaryClinicEmail(UUID clinicId) {
    dsl.update(CLINIC_EMAIL)
        .set(CLINIC_EMAIL.IS_PRIMARY, false)
        .where(CLINIC_EMAIL.CLINIC_ID.eq(clinicId))
        .execute();
  }

  private void clearPrimaryLocation(UUID clinicId) {
    dsl.update(CLINIC_LOCATION)
        .set(CLINIC_LOCATION.IS_PRIMARY, false)
        .where(CLINIC_LOCATION.CLINIC_ID.eq(clinicId))
        .execute();
  }

  private void assertClinicExists(UUID clinicId) {
    if (!dsl.fetchExists(dsl.selectFrom(CLINIC).where(CLINIC.ID.eq(clinicId)))) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Clinic not found");
    }
  }
}
