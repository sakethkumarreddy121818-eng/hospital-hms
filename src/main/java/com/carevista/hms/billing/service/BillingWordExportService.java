package com.carevista.hms.billing.service;

import com.carevista.hms.billing.dto.BillingHistoryItemDto;
import com.carevista.hms.billing.dto.BillingHistoryReportDto;
import org.apache.poi.wp.usermodel.HeaderFooterType;
import org.apache.poi.xwpf.usermodel.*;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.text.DecimalFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class BillingWordExportService {

    private static final String COLOR_PRIMARY = "1E3A8A";    // Deep Navy
    private static final String COLOR_SECONDARY = "0284C7";  // Sky Blue
    private static final String COLOR_BG_HEADER = "F1F5F9";  // Light Slate
    private static final String COLOR_ROW_ALT = "F8FAFC";    // Very Light Slate
    private static final String COLOR_BORDER = "CBD5E1";     // Slate Border
    private static final String COLOR_MUTED = "64748B";      // Text Muted
    private static final String COLOR_SUCCESS = "166534";    // Green
    private static final String COLOR_DANGER = "B91C1C";     // Red

    private static final DecimalFormat CURRENCY_FMT = new DecimalFormat("#,##0.00");
    private static final DateTimeFormatter PRINT_DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    public byte[] generateBillingHistoryWord(BillingHistoryReportDto report) {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            // 1. Set Page to A4 Landscape
            configureLandscapePage(document);

            // 2. Configure Header & Footer
            configureFooter(document, report.getHospitalFilter());

            // 3. Document Title & Subtitle
            addHeaderTitle(document, report);

            // 4. Financial Summary Cards / Table
            addSummarySection(document, report);

            // 5. Billing Records Table
            addBillingTable(document, report);

            document.write(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error generating patient billing Word document: " + e.getMessage(), e);
        }
    }

    private void configureLandscapePage(XWPFDocument document) {
        CTSectPr sectPr = document.getDocument().getBody().addNewSectPr();
        CTPageSz pageSz = sectPr.addNewPgSz();
        pageSz.setOrient(STPageOrientation.LANDSCAPE);
        pageSz.setW(BigInteger.valueOf(16840)); // A4 Landscape width (dxa)
        pageSz.setH(BigInteger.valueOf(11900)); // A4 Landscape height (dxa)

        CTPageMar pageMar = sectPr.addNewPgMar();
        pageMar.setTop(BigInteger.valueOf(720));    // 0.5 inch margins
        pageMar.setBottom(BigInteger.valueOf(720));
        pageMar.setLeft(BigInteger.valueOf(720));
        pageMar.setRight(BigInteger.valueOf(720));
    }

    private void configureFooter(XWPFDocument document, String hospitalFilter) {
        XWPFFooter footer = document.createFooter(HeaderFooterType.DEFAULT);
        XWPFParagraph p = footer.createParagraph();
        p.setAlignment(ParagraphAlignment.BOTH);

        XWPFRun rLeft = p.createRun();
        rLeft.setText("CareVista Hospital Management SaaS  |  " + (hospitalFilter != null ? hospitalFilter : "All Hospitals") + "  |  Confidential Healthcare Record");
        rLeft.setFontFamily("Segoe UI");
        rLeft.setFontSize(8);
        rLeft.setColor(COLOR_MUTED);
        rLeft.setItalic(true);
    }

    private void addHeaderTitle(XWPFDocument document, BillingHistoryReportDto report) {
        String printDate = LocalDateTime.now().format(PRINT_DATE_FMT);

        // Title
        XWPFParagraph titlePara = document.createParagraph();
        titlePara.setSpacingAfter(40);
        titlePara.setSpacingBefore(0);

        XWPFRun r1 = titlePara.createRun();
        r1.setText("CAREVISTA HOSPITAL MANAGEMENT SAAS");
        r1.setFontFamily("Segoe UI");
        r1.setFontSize(15);
        r1.setBold(true);
        r1.setColor(COLOR_PRIMARY);

        // Subtitle
        XWPFParagraph subPara = document.createParagraph();
        subPara.setSpacingAfter(100);
        subPara.setSpacingBefore(0);

        XWPFRun r2 = subPara.createRun();
        r2.setText("PATIENT BILLING HISTORY & AUDIT REPORT");
        r2.setFontFamily("Segoe UI");
        r2.setFontSize(11);
        r2.setBold(true);
        r2.setColor(COLOR_SECONDARY);

        // Metadata Table
        XWPFTable metaTable = document.createTable(2, 4);
        metaTable.setWidth("100%");
        styleTableBorders(metaTable);

        setCell(metaTable.getRow(0).getCell(0), "Hospital / Tenant:", true, COLOR_PRIMARY, 9, false);
        setCell(metaTable.getRow(0).getCell(1), report.getHospitalFilter() != null ? report.getHospitalFilter() : "All Hospitals (Multi-Tenant)", false, "000000", 9, false);
        setCell(metaTable.getRow(0).getCell(2), "Billing Period:", true, COLOR_PRIMARY, 9, false);
        setCell(metaTable.getRow(0).getCell(3), report.getPeriodName() + " (" + report.getStartDate() + " to " + report.getEndDate() + ")", false, "000000", 9, false);

        setCell(metaTable.getRow(1).getCell(0), "Generated Date & Time:", true, COLOR_PRIMARY, 9, false);
        setCell(metaTable.getRow(1).getCell(1), printDate, false, "000000", 9, false);
        setCell(metaTable.getRow(1).getCell(2), "Generated By & Source:", true, COLOR_PRIMARY, 9, false);
        setCell(metaTable.getRow(1).getCell(3), "Super Admin  |  MySQL 8.x Production Database", false, "000000", 9, false);

        // Spacer
        XWPFParagraph spacer = document.createParagraph();
        spacer.setSpacingAfter(120);
        spacer.setSpacingBefore(40);
    }

    private void addSummarySection(XWPFDocument document, BillingHistoryReportDto report) {
        XWPFParagraph hPara = document.createParagraph();
        hPara.setSpacingBefore(60);
        hPara.setSpacingAfter(40);
        XWPFRun hRun = hPara.createRun();
        hRun.setText("FINANCIAL SUMMARY & REVENUE TOTALS");
        hRun.setFontFamily("Segoe UI");
        hRun.setFontSize(10);
        hRun.setBold(true);
        hRun.setColor(COLOR_PRIMARY);

        XWPFTable summaryTable = document.createTable(2, 7);
        summaryTable.setWidth("100%");
        styleTableBorders(summaryTable);

        String[] headers = {"TOTAL BILLS", "GROSS SUBTOTAL", "TOTAL DISCOUNT", "TOTAL GST", "TOTAL BILLED", "AMOUNT PAID", "OUTSTANDING"};
        for (int i = 0; i < headers.length; i++) {
            XWPFTableCell cell = summaryTable.getRow(0).getCell(i);
            cell.setColor(COLOR_PRIMARY);
            setCell(cell, headers[i], true, "FFFFFF", 8, true);
        }

        XWPFTableRow vRow = summaryTable.getRow(1);
        setCell(vRow.getCell(0), String.valueOf(report.getTotalRecords()), true, "000000", 9, true);
        setCell(vRow.getCell(1), formatCurrency(report.getGrossSubtotal()), true, "000000", 9, true);
        setCell(vRow.getCell(2), formatCurrency(report.getTotalDiscount()), true, "D97706", 9, true);
        setCell(vRow.getCell(3), formatCurrency(report.getTotalGst()), true, "000000", 9, true);
        setCell(vRow.getCell(4), formatCurrency(report.getTotalBilled()), true, COLOR_PRIMARY, 9, true);
        setCell(vRow.getCell(5), formatCurrency(report.getTotalPaid()), true, COLOR_SUCCESS, 9, true);

        String outColor = report.getTotalOutstanding().compareTo(BigDecimal.ZERO) > 0 ? COLOR_DANGER : COLOR_SUCCESS;
        setCell(vRow.getCell(6), formatCurrency(report.getTotalOutstanding()), true, outColor, 9, true);

        for (int i = 0; i < 7; i++) {
            vRow.getCell(i).setColor(COLOR_BG_HEADER);
        }

        XWPFParagraph spacer = document.createParagraph();
        spacer.setSpacingAfter(120);
        spacer.setSpacingBefore(40);
    }

    private void addBillingTable(XWPFDocument document, BillingHistoryReportDto report) {
        XWPFParagraph hPara = document.createParagraph();
        hPara.setSpacingBefore(60);
        hPara.setSpacingAfter(40);
        XWPFRun hRun = hPara.createRun();
        hRun.setText("VERIFIED PATIENT BILLING AUDIT LEDGER (" + report.getTotalRecords() + " RECORDS)");
        hRun.setFontFamily("Segoe UI");
        hRun.setFontSize(10);
        hRun.setBold(true);
        hRun.setColor(COLOR_PRIMARY);

        String[] cols = {
                "#", "Bill No & Type", "Hospital", "Patient / UHID", "OP / IP ID",
                "Date & Time", "Doctor & Dept", "Services / Items (Qty)", "Total", "Paid", "Status & Mode"
        };

        int totalRows = Math.max(1, report.getItems().size()) + 1;
        XWPFTable table = document.createTable(totalRows, cols.length);
        table.setWidth("100%");
        styleTableBorders(table);

        // Header Row
        XWPFTableRow headerRow = table.getRow(0);
        headerRow.getCtRow().addNewTrPr().addNewTblHeader(); // Repeat on every page
        headerRow.getCtRow().addNewTrPr().addNewCantSplit(); // Prevent splitting row

        for (int i = 0; i < cols.length; i++) {
            XWPFTableCell cell = headerRow.getCell(i);
            cell.setColor(COLOR_PRIMARY);
            setCell(cell, cols[i], true, "FFFFFF", 8, true);
        }

        if (report.getItems().isEmpty()) {
            XWPFTableRow emptyRow = table.getRow(1);
            emptyRow.getCtRow().addNewTrPr().addNewCantSplit();
            XWPFTableCell emptyCell = emptyRow.getCell(0);
            setCell(emptyCell, "No billing records found for the selected hospital and date range.", false, COLOR_MUTED, 8, true);
            // Merge cells across
            for (int i = 1; i < cols.length; i++) {
                emptyRow.getCell(i).setText("");
            }
            return;
        }

        int rowIndex = 1;
        for (BillingHistoryItemDto item : report.getItems()) {
            XWPFTableRow row = table.getRow(rowIndex);
            row.getCtRow().addNewTrPr().addNewCantSplit();

            String rowColor = (rowIndex % 2 == 0) ? COLOR_ROW_ALT : "FFFFFF";

            // 1. #
            setCell(row.getCell(0), String.valueOf(rowIndex), false, "000000", 8, true);

            // 2. Bill No & Type
            String billText = item.getBillNumber() + "\n[" + (item.getBillingType() != null ? item.getBillingType() : "General") + "]";
            setCell(row.getCell(1), billText, true, COLOR_PRIMARY, 8, false);

            // 3. Hospital
            setCell(row.getCell(2), item.getHospitalName() != null ? item.getHospitalName() : "CareVista", false, "000000", 8, false);

            // 4. Patient / UHID
            String patientText = (item.getPatientName() != null ? item.getPatientName() : "Patient") + "\nUHID: " + (item.getUhid() != null ? item.getUhid() : "N/A");
            setCell(row.getCell(3), patientText, false, "000000", 8, false);

            // 5. OP / IP ID
            String opIp = (item.getOpId() != null && !item.getOpId().equals("N/A") && !item.getOpId().isEmpty())
                    ? item.getOpId()
                    : ((item.getIpId() != null && !item.getIpId().equals("N/A") && !item.getIpId().isEmpty()) ? item.getIpId() : "-");
            setCell(row.getCell(4), opIp, false, COLOR_MUTED, 8, true);

            // 6. Date & Time
            String dt = (item.getBillDate() != null ? item.getBillDate().toString() : "") + (item.getBillTime() != null ? "\n" + item.getBillTime() : "");
            setCell(row.getCell(5), dt, false, "000000", 8, true);

            // 7. Doctor & Dept
            String docDept = (item.getDoctorName() != null ? item.getDoctorName() : "-") + "\n" + (item.getDepartment() != null ? item.getDepartment() : "General");
            setCell(row.getCell(6), docDept, false, "000000", 8, false);

            // 8. Services / Items (Qty)
            String svc = (item.getServicesOrItems() != null ? item.getServicesOrItems() : "Healthcare Services") +
                    (item.getQuantity() != null && item.getQuantity() > 1 ? " (x" + item.getQuantity() + ")" : "");
            setCell(row.getCell(7), svc, false, "000000", 8, false);

            // 9. Total Billed
            setCell(row.getCell(8), formatCurrency(item.getTotalAmount()), true, COLOR_PRIMARY, 8, true);

            // 10. Amount Paid
            setCell(row.getCell(9), formatCurrency(item.getPaidAmount()), false, COLOR_SUCCESS, 8, true);

            // 11. Status & Mode
            String statusMode = (item.getPaymentStatus() != null ? item.getPaymentStatus() : "PAID") + " (" + (item.getPaymentMethod() != null ? item.getPaymentMethod() : "CASH") + ")";
            String statusColor = "PAID".equalsIgnoreCase(item.getPaymentStatus()) ? COLOR_SUCCESS : COLOR_DANGER;
            setCell(row.getCell(10), statusMode, true, statusColor, 8, true);

            if (!"FFFFFF".equals(rowColor)) {
                for (int i = 0; i < cols.length; i++) {
                    row.getCell(i).setColor(rowColor);
                }
            }

            rowIndex++;
        }
    }

    private void setCell(XWPFTableCell cell, String text, boolean bold, String hexColor, int fontSize, boolean center) {
        // Clear default paragraph
        while (cell.getParagraphs().size() > 0) {
            cell.removeParagraph(0);
        }

        String[] lines = text.split("\n");
        for (int i = 0; i < lines.length; i++) {
            XWPFParagraph p = cell.addParagraph();
            p.setSpacingBefore(0);
            p.setSpacingAfter(0);
            if (center) {
                p.setAlignment(ParagraphAlignment.CENTER);
            } else {
                p.setAlignment(ParagraphAlignment.LEFT);
            }

            XWPFRun r = p.createRun();
            r.setText(lines[i]);
            r.setFontFamily("Segoe UI");
            r.setFontSize(fontSize);
            r.setBold(bold && (i == 0)); // only first line bold if multi-line
            r.setColor(hexColor);
        }
    }

    private void styleTableBorders(XWPFTable table) {
        CTTblPr tblPr = table.getCTTbl().getTblPr();
        CTTblBorders borders = tblPr.addNewTblBorders();
        borders.addNewBottom().setVal(STBorder.SINGLE);
        borders.getBottom().setColor(COLOR_BORDER);
        borders.getBottom().setSz(BigInteger.valueOf(4));

        borders.addNewTop().setVal(STBorder.SINGLE);
        borders.getTop().setColor(COLOR_BORDER);
        borders.getTop().setSz(BigInteger.valueOf(4));

        borders.addNewLeft().setVal(STBorder.SINGLE);
        borders.getLeft().setColor(COLOR_BORDER);
        borders.getLeft().setSz(BigInteger.valueOf(4));

        borders.addNewRight().setVal(STBorder.SINGLE);
        borders.getRight().setColor(COLOR_BORDER);
        borders.getRight().setSz(BigInteger.valueOf(4));

        borders.addNewInsideH().setVal(STBorder.SINGLE);
        borders.getInsideH().setColor(COLOR_BORDER);
        borders.getInsideH().setSz(BigInteger.valueOf(4));

        borders.addNewInsideV().setVal(STBorder.SINGLE);
        borders.getInsideV().setColor(COLOR_BORDER);
        borders.getInsideV().setSz(BigInteger.valueOf(4));
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "Rs. 0.00";
        return "Rs. " + CURRENCY_FMT.format(amount);
    }
}
