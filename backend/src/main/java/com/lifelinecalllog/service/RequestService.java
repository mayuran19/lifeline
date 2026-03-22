package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.*;

import com.lifelinecalllog.dto.RequestCreateRequest;
import com.lifelinecalllog.dto.RequestResponse;
import com.lifelinecalllog.dto.RequestUpdateRequest;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RequestService {

  private final DSLContext dsl;

  private static final Field<String> CLINIC_NAME = CLINIC.NAME.as("clinic_name");
  private static final Field<String> DOCTOR_NAME =
      DSL.concat(DOCTOR.FIRST_NAME, DSL.val(" "), DOCTOR.LAST_NAME).as("doctor_name");
  private static final Field<String> LOCATION_NAME = CLINIC_LOCATION.NAME.as("location_name");
  private static final Field<String> ENTERED_BY_NAME =
      DSL.concat(APP_USER.FIRST_NAME, DSL.val(" "), APP_USER.LAST_NAME).as("entered_by_name");

  public RequestService(DSLContext dsl) {
    this.dsl = dsl;
  }

  public List<RequestResponse> findAll(String status, UUID clinicId) {
    Condition condition = DSL.trueCondition();
    if (status != null) condition = condition.and(REQUEST.STATUS.eq(status));
    if (clinicId != null) condition = condition.and(REQUEST.CLINIC_ID.eq(clinicId));
    return buildSelect()
        .where(condition)
        .orderBy(REQUEST.RECEIVED_AT.desc())
        .fetch(r -> toResponse(r, fetchPatients(r.get(REQUEST.ID))));
  }

  public RequestResponse findById(UUID id) {
    var record =
        buildSelect()
            .where(REQUEST.ID.eq(id))
            .fetchOptional()
            .orElseThrow(() -> new IllegalArgumentException("Request not found: " + id));
    return toResponse(record, fetchPatients(id));
  }

  @Transactional
  public RequestResponse create(RequestCreateRequest req) {
    var record = dsl.newRecord(REQUEST);
    record.setClinicId(req.clinicId());
    record.setClinicLocationId(req.clinicLocationId());
    record.setDoctorId(req.doctorId());
    record.setEnteredBy(req.enteredBy());
    record.setVisitType(req.visitType());
    record.setUrgency(req.urgency());
    record.setStatus("RECEIVED");
    record.setRequestDetails(req.requestDetails());
    record.setReceivedAt(req.receivedAt() != null ? req.receivedAt() : OffsetDateTime.now());
    record.store();

    UUID requestId = record.getId();
    if (req.patients() != null) {
      for (var p : req.patients()) {
        var rp = dsl.newRecord(REQUEST_PATIENT);
        rp.setRequestId(requestId);
        rp.setPatientId(p.patientId());
        rp.setNotes(p.notes());
        rp.store();
      }
    }

    return findById(requestId);
  }

  @Transactional
  public RequestResponse update(UUID id, RequestUpdateRequest req) {
    var record =
        dsl.selectFrom(REQUEST)
            .where(REQUEST.ID.eq(id))
            .fetchOptional()
            .orElseThrow(() -> new IllegalArgumentException("Request not found: " + id));

    if (req.clinicId() != null) record.setClinicId(req.clinicId());
    if (req.clinicLocationId() != null) record.setClinicLocationId(req.clinicLocationId());
    if (req.doctorId() != null) record.setDoctorId(req.doctorId());
    if (req.enteredBy() != null) record.setEnteredBy(req.enteredBy());
    if (req.visitType() != null) record.setVisitType(req.visitType());
    if (req.urgency() != null) record.setUrgency(req.urgency());
    if (req.status() != null) record.setStatus(req.status());
    if (req.requestDetails() != null) record.setRequestDetails(req.requestDetails());
    if (req.receivedAt() != null) record.setReceivedAt(req.receivedAt());
    if (req.startTime() != null) record.setStartTime(req.startTime());
    if (req.endTime() != null) record.setEndTime(req.endTime());
    record.store();

    return findById(id);
  }

  @Transactional
  public RequestResponse addPatient(UUID requestId, RequestCreateRequest.PatientOnRequest req) {
    if (!dsl.fetchExists(dsl.selectFrom(REQUEST).where(REQUEST.ID.eq(requestId)))) {
      throw new IllegalArgumentException("Request not found: " + requestId);
    }
    var rp = dsl.newRecord(REQUEST_PATIENT);
    rp.setRequestId(requestId);
    rp.setPatientId(req.patientId());
    rp.setNotes(req.notes());
    rp.store();
    return findById(requestId);
  }

  @Transactional
  public RequestResponse removePatient(UUID requestId, UUID requestPatientId) {
    int deleted =
        dsl.deleteFrom(REQUEST_PATIENT)
            .where(
                REQUEST_PATIENT
                    .ID
                    .eq(requestPatientId)
                    .and(REQUEST_PATIENT.REQUEST_ID.eq(requestId)))
            .execute();
    if (deleted == 0)
      throw new IllegalArgumentException("Request patient not found: " + requestPatientId);
    return findById(requestId);
  }

  private org.jooq.SelectOnConditionStep<Record> buildSelect() {
    List<Field<?>> fields = new ArrayList<>(List.of(REQUEST.fields()));
    fields.add(CLINIC_NAME);
    fields.add(LOCATION_NAME);
    fields.add(DOCTOR_NAME);
    fields.add(ENTERED_BY_NAME);
    return dsl.select(fields)
        .from(REQUEST)
        .join(CLINIC)
        .on(REQUEST.CLINIC_ID.eq(CLINIC.ID))
        .leftJoin(CLINIC_LOCATION)
        .on(REQUEST.CLINIC_LOCATION_ID.eq(CLINIC_LOCATION.ID))
        .leftJoin(DOCTOR)
        .on(REQUEST.DOCTOR_ID.eq(DOCTOR.ID))
        .leftJoin(APP_USER)
        .on(REQUEST.ENTERED_BY.eq(APP_USER.ID));
  }

  private List<RequestResponse.RequestPatientResponse> fetchPatients(UUID requestId) {
    return dsl.select(
            REQUEST_PATIENT.ID,
            REQUEST_PATIENT.PATIENT_ID,
            REQUEST_PATIENT.NOTES,
            PATIENT.FIRST_NAME,
            PATIENT.LAST_NAME,
            PATIENT.MEDICARE_NO)
        .from(REQUEST_PATIENT)
        .join(PATIENT)
        .on(REQUEST_PATIENT.PATIENT_ID.eq(PATIENT.ID))
        .where(REQUEST_PATIENT.REQUEST_ID.eq(requestId))
        .orderBy(PATIENT.LAST_NAME, PATIENT.FIRST_NAME)
        .fetch(
            r ->
                new RequestResponse.RequestPatientResponse(
                    r.get(REQUEST_PATIENT.ID),
                    r.get(REQUEST_PATIENT.PATIENT_ID),
                    r.get(PATIENT.FIRST_NAME),
                    r.get(PATIENT.LAST_NAME),
                    r.get(PATIENT.MEDICARE_NO),
                    r.get(REQUEST_PATIENT.NOTES)));
  }

  private RequestResponse toResponse(
      Record r, List<RequestResponse.RequestPatientResponse> patients) {
    return new RequestResponse(
        r.get(REQUEST.ID),
        r.get(REQUEST.CLINIC_ID),
        r.get("clinic_name", String.class),
        r.get(REQUEST.CLINIC_LOCATION_ID),
        r.get("location_name", String.class),
        r.get(REQUEST.DOCTOR_ID),
        r.get("doctor_name", String.class),
        r.get(REQUEST.ENTERED_BY),
        r.get("entered_by_name", String.class),
        r.get(REQUEST.VISIT_TYPE),
        r.get(REQUEST.URGENCY),
        r.get(REQUEST.STATUS),
        r.get(REQUEST.REQUEST_DETAILS),
        r.get(REQUEST.RECEIVED_AT),
        r.get(REQUEST.START_TIME),
        r.get(REQUEST.END_TIME),
        patients,
        r.get(REQUEST.CREATED_DATE),
        r.get(REQUEST.CREATED_BY),
        r.get(REQUEST.LAST_MODIFIED_DATE),
        r.get(REQUEST.LAST_MODIFIED_BY),
        r.get(REQUEST.VERSION));
  }
}
