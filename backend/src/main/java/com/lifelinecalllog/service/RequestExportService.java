package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

@Service
public class RequestExportService {

  private static final DateTimeFormatter DT_FMT =
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneOffset.UTC);

  private final DSLContext dsl;

  private static final Field<String> CLINIC_NAME = CLINIC.NAME.as("clinic_name");
  private static final Field<String> DOCTOR_NAME =
      DSL.concat(DOCTOR.FIRST_NAME, DSL.val(" "), DOCTOR.LAST_NAME).as("doctor_name");
  private static final Field<String> LOCATION_NAME = CLINIC_LOCATION.NAME.as("location_name");
  private static final Field<String> ENTERED_BY_NAME =
      DSL.concat(APP_USER.FIRST_NAME, DSL.val(" "), APP_USER.LAST_NAME).as("entered_by_name");

  public RequestExportService(DSLContext dsl) {
    this.dsl = dsl;
  }

  public byte[] export(
      String status,
      UUID clinicId,
      UUID locationId,
      UUID doctorId,
      String receivedDate,
      Map<String, String> visitTypeLabels,
      Map<String, String> urgencyLabels,
      Map<String, String> statusLabels)
      throws IOException {

    // Fetch all matching records (no pagination for export)
    Condition condition = DSL.trueCondition();
    if (status != null) condition = condition.and(REQUEST.STATUS.eq(status));
    if (clinicId != null) condition = condition.and(REQUEST.CLINIC_ID.eq(clinicId));
    if (locationId != null) condition = condition.and(REQUEST.CLINIC_LOCATION_ID.eq(locationId));
    if (doctorId != null) condition = condition.and(REQUEST.DOCTOR_ID.eq(doctorId));
    if (receivedDate != null) {
      LocalDate date = LocalDate.parse(receivedDate);
      condition =
          condition.and(
              REQUEST
                  .RECEIVED_AT
                  .greaterOrEqual(date.atStartOfDay().atOffset(ZoneOffset.UTC))
                  .and(
                      REQUEST.RECEIVED_AT.lessThan(
                          date.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC))));
    }

    java.util.List<Field<?>> fields = new java.util.ArrayList<>(List.of(REQUEST.fields()));
    fields.add(CLINIC_NAME);
    fields.add(LOCATION_NAME);
    fields.add(DOCTOR_NAME);
    fields.add(ENTERED_BY_NAME);

    var records =
        dsl.select(fields)
            .from(REQUEST)
            .join(CLINIC)
            .on(REQUEST.CLINIC_ID.eq(CLINIC.ID))
            .leftJoin(CLINIC_LOCATION)
            .on(REQUEST.CLINIC_LOCATION_ID.eq(CLINIC_LOCATION.ID))
            .leftJoin(DOCTOR)
            .on(REQUEST.DOCTOR_ID.eq(DOCTOR.ID))
            .leftJoin(APP_USER)
            .on(REQUEST.ENTERED_BY.eq(APP_USER.ID))
            .where(condition)
            .orderBy(REQUEST.RECEIVED_AT.desc())
            .fetch();

    try (XSSFWorkbook wb = new XSSFWorkbook()) {
      Sheet sheet = wb.createSheet("Requests");

      // ── Cell styles ──
      CellStyle headerStyle = wb.createCellStyle();
      Font headerFont = wb.createFont();
      headerFont.setBold(true);
      headerStyle.setFont(headerFont);
      headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      headerStyle.setBorderBottom(BorderStyle.THIN);

      CellStyle wrapStyle = wb.createCellStyle();
      wrapStyle.setWrapText(true);
      wrapStyle.setVerticalAlignment(VerticalAlignment.TOP);

      CellStyle normalStyle = wb.createCellStyle();
      normalStyle.setVerticalAlignment(VerticalAlignment.TOP);

      // ── Header row ──
      String[] headers = {
        "Received At", "Clinic", "Location", "Doctor", "Entered By",
        "Visit Type", "Urgency", "Status", "Request Details", "Patients"
      };
      Row headerRow = sheet.createRow(0);
      for (int i = 0; i < headers.length; i++) {
        Cell cell = headerRow.createCell(i);
        cell.setCellValue(headers[i]);
        cell.setCellStyle(headerStyle);
      }

      // ── Data rows ──
      int rowIdx = 1;
      for (var r : records) {
        UUID requestId = r.get(REQUEST.ID);

        // Fetch patients for this request
        var patients =
            dsl.select(
                    REQUEST_PATIENT.NOTES,
                    PATIENT.FIRST_NAME,
                    PATIENT.LAST_NAME,
                    PATIENT.MEDICARE_NO)
                .from(REQUEST_PATIENT)
                .join(PATIENT)
                .on(REQUEST_PATIENT.PATIENT_ID.eq(PATIENT.ID))
                .where(REQUEST_PATIENT.REQUEST_ID.eq(requestId))
                .orderBy(PATIENT.LAST_NAME, PATIENT.FIRST_NAME)
                .fetch();

        String patientsText =
            patients.stream()
                .map(
                    p -> {
                      String name = p.get(PATIENT.FIRST_NAME) + " " + p.get(PATIENT.LAST_NAME);
                      String medicare = p.get(PATIENT.MEDICARE_NO);
                      String notes = p.get(REQUEST_PATIENT.NOTES);
                      StringBuilder sb = new StringBuilder(name);
                      if (medicare != null && !medicare.isBlank())
                        sb.append(" (").append(medicare).append(")");
                      if (notes != null && !notes.isBlank()) sb.append(" — ").append(notes);
                      return sb.toString();
                    })
                .collect(java.util.stream.Collectors.joining("\n"));

        // Strip HTML from request details, preserve block-level newlines
        String rawDetails = r.get(REQUEST.REQUEST_DETAILS);
        String details = htmlToText(rawDetails);

        var receivedAt = r.get(REQUEST.RECEIVED_AT);

        Row row = sheet.createRow(rowIdx++);
        setCell(row, 0, receivedAt != null ? DT_FMT.format(receivedAt) : "", normalStyle);
        setCell(row, 1, r.get("clinic_name", String.class), normalStyle);
        setCell(row, 2, r.get("location_name", String.class), normalStyle);
        String docName = r.get("doctor_name", String.class);
        setCell(row, 3, docName != null && !docName.isBlank() ? "Dr. " + docName : "", normalStyle);
        setCell(row, 4, r.get("entered_by_name", String.class), normalStyle);
        setCell(row, 5, label(visitTypeLabels, r.get(REQUEST.VISIT_TYPE)), normalStyle);
        setCell(row, 6, label(urgencyLabels, r.get(REQUEST.URGENCY)), normalStyle);
        setCell(row, 7, label(statusLabels, r.get(REQUEST.STATUS)), normalStyle);
        setCell(row, 8, details, wrapStyle);
        setCell(row, 9, patientsText, wrapStyle);
      }

      // ── Column widths ──
      int[] colWidths = {20, 25, 20, 25, 20, 18, 12, 14, 50, 40};
      for (int i = 0; i < colWidths.length; i++) {
        sheet.setColumnWidth(i, colWidths[i] * 256);
      }

      // Auto-filter on header row
      sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, headers.length - 1));

      ByteArrayOutputStream out = new ByteArrayOutputStream();
      wb.write(out);
      return out.toByteArray();
    }
  }

  private void setCell(Row row, int col, String value, CellStyle style) {
    Cell cell = row.createCell(col);
    cell.setCellValue(value != null ? value : "");
    cell.setCellStyle(style);
  }

  private String label(Map<String, String> map, String key) {
    if (key == null) return "";
    return map.getOrDefault(key, key);
  }

  // @formatter:off
  private String htmlToText(String html) {
    if (html == null || html.isBlank()) return "";
    // Block-level tags → newline before stripping
    String text =
        html.replaceAll("(?i)<br\\s*/?>", "\n")
            .replaceAll("(?i)</(p|div|li|h[1-6]|tr)>", "\n")
            .replaceAll("(?i)<li[^>]*>", "• ")
            .replaceAll("<[^>]+>", "")
            .replaceAll("&nbsp;", " ")
            .replaceAll("&amp;", "&")
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">")
            .replaceAll("&quot;", "\"")
            // Collapse 3+ consecutive newlines to 2
            .replaceAll("\n{3,}", "\n\n")
            .strip();
    return text;
  }
  // @formatter:on
}
