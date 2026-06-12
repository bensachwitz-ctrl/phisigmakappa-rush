import { jsPDF } from "jspdf";
import { put } from "@vercel/blob";
import crypto from "crypto";

export interface DuesReceiptDetails {
  brotherName: string;
  brotherEmail: string;
  amountCents: number;
  year: string; // e.g. "2026" or "Fall 2026"
  paidAt: Date;
  status: string;
  stripePaymentIntentId?: string | null;
  chapterName: string;
  schoolName?: string;
  brandHex?: string;
  duesLabel?: string;
}

/**
 * Helper to parse hex colors into RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Generates a branded dues payment receipt PDF.
 */
export function generateDuesReceiptBuffer(details: DuesReceiptDetails): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Premium colors
  const primaryColor = { r: 15, g: 23, b: 42 }; // Dark Slate (#0f172a)
  const brandRgb = details.brandHex ? hexToRgb(details.brandHex) : { r: 180, g: 83, b: 9 }; // Gold/Amber fallback
  const mutedTextColor = { r: 100, g: 116, b: 139 }; // Slate-500 (#64748b)

  // 1. Draw elegant outer double border
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(1.0);
  doc.rect(8, 8, width - 16, height - 16);

  doc.setDrawColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.setLineWidth(0.4);
  doc.rect(9.5, 9.5, width - 19, height - 19);

  // Decorative corner brackets
  const drawCornerBrackets = (x: number, y: number, size: number) => {
    // Top-left
    doc.line(x, y, x + size, y);
    doc.line(x, y, x, y + size);
    // Top-right
    const trX = width - x;
    doc.line(trX, y, trX - size, y);
    doc.line(trX, y, trX, y + size);
    // Bottom-left
    const blY = height - y;
    doc.line(x, blY, x + size, blY);
    doc.line(x, blY, x, blY - size);
    // Bottom-right
    doc.line(trX, blY, trX - size, blY);
    doc.line(trX, blY, trX, blY - size);
  };
  doc.setLineWidth(0.6);
  doc.setDrawColor(brandRgb.r, brandRgb.g, brandRgb.b);
  drawCornerBrackets(12, 12, 6);

  // 2. Header
  const orgName = details.chapterName || "GREEK LIFE SYSTEMS PLATFORM";
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(orgName.toUpperCase(), width / 2, 22, { align: "center" });

  if (details.schoolName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedTextColor.r, mutedTextColor.g, mutedTextColor.b);
    doc.text(details.schoolName.toUpperCase(), width / 2, 26, { align: "center" });
  }

  // Divider line
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(0.5);
  doc.line(30, 29, width - 30, 29);

  // Accent ornament
  doc.setDrawColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.setLineWidth(1.5);
  doc.line(width / 2 - 10, 29, width / 2 + 10, 29);

  // Title
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("PAYMENT RECEIPT", width / 2, 42, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(mutedTextColor.r, mutedTextColor.g, mutedTextColor.b);
  doc.text("Official Chapter Dues Statement", width / 2, 48, { align: "center" });

  // Generate unique transaction reference hash
  const timestamp = details.paidAt.toISOString();
  const rawFingerprint = `${details.brotherEmail}|${details.amountCents}|${timestamp}`;
  const receiptHash = crypto.createHash("sha256").update(rawFingerprint).digest("hex").substring(0, 16).toUpperCase();

  // 3. Information Blocks
  let y = 58;

  const drawSectionHeader = (title: string, currentY: number) => {
    doc.setFillColor(248, 250, 252); // Very light grey bg
    doc.rect(15, currentY - 5, width - 30, 8, "F");
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, 18, currentY);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(15, currentY + 3, width - 15, currentY + 3);
    return currentY + 12;
  };

  // Section: Member & Billing Information
  y = drawSectionHeader("MEMBER & BILLING DETAILS", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  
  doc.text("Billed To:", 20, y);
  doc.text("Email Address:", 20, y + 7);
  doc.text("Payment Date:", 20, y + 14);
  doc.text("Payment Method:", 20, y + 21);

  doc.setFont("helvetica", "normal");
  doc.text(details.brotherName, 55, y);
  doc.text(details.brotherEmail, 55, y + 7);
  doc.text(details.paidAt.toLocaleDateString("en-US", { dateStyle: "long" }) + " " + details.paidAt.toLocaleTimeString("en-US", { timeStyle: "short" }), 55, y + 14);
  doc.text(details.stripePaymentIntentId ? "Stripe Credit/Debit" : "Manual / Cash", 55, y + 21);

  // Box on the right for Receipt Meta
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(130, y - 4, 60, 28);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Receipt No:", 134, y + 1);
  doc.text("Status:", 134, y + 8);
  doc.text("Billing Term:", 134, y + 15);
  doc.text("Total Paid:", 134, y + 22);

  doc.setFont("courier", "bold");
  doc.text(receiptHash, 154, y + 1);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129); // Success Green
  doc.text(details.status.toUpperCase(), 154, y + 8);
  
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setFont("helvetica", "normal");
  doc.text(details.year, 154, y + 15);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.text(`$${(details.amountCents / 100).toFixed(2)}`, 154, y + 22);

  y += 36;

  // Section: Invoice Summary (Table)
  y = drawSectionHeader("TRANSACTION SUMMARY", y);

  // Table Headers
  doc.setFillColor(241, 245, 249); // light blue/slate
  doc.rect(15, y - 5, width - 30, 8, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("Item Description", 18, y);
  doc.text("Year/Term", 110, y);
  doc.text("Unit Price", 145, y);
  doc.text("Amount", 175, y);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(15, y + 3, width - 15, y + 3);

  y += 11;

  // Table Row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const duesLabel = details.duesLabel || "Chapter Membership Dues";
  doc.text(duesLabel, 18, y);
  doc.text(details.year, 110, y);
  doc.text(`$${(details.amountCents / 100).toFixed(2)}`, 145, y);
  doc.text(`$${(details.amountCents / 100).toFixed(2)}`, 175, y);

  doc.setDrawColor(241, 245, 249);
  doc.line(15, y + 4, width - 15, y + 4);

  y += 14;

  // Subtotal and Total calculations
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Subtotal:", 145, y);
  doc.text(`$${(details.amountCents / 100).toFixed(2)}`, 175, y);

  y += 7;
  doc.text("Processing / Tech Fee:", 145, y);
  doc.text("$0.00", 175, y);

  y += 8;
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(0.4);
  doc.line(140, y - 5, width - 15, y - 5);

  doc.setFont("helvetica", "bold");
  doc.text("Total Amount Paid:", 145, y);
  doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.text(`$${(details.amountCents / 100).toFixed(2)}`, 175, y);

  y += 24;

  // Transaction verification block
  y = drawSectionHeader("VERIFICATION & FORENSICS", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("Stripe Payment Intent:", 20, y);
  if (details.stripePaymentIntentId) {
    doc.setFont("courier", "normal");
    doc.text(details.stripePaymentIntentId, 65, y);
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("Manual Payment Reference", 65, y);
  }

  doc.setFont("helvetica", "bold");
  doc.text("Digital Fingerprint:", 20, y + 7);
  doc.setFont("courier", "bold");
  const digitalFingerprint = crypto.createHash("sha256").update(receiptHash + timestamp).digest("hex").substring(0, 32).toUpperCase();
  doc.text(digitalFingerprint, 65, y + 7);

  // 4. Verification Footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, height - 35, width - 20, height - 35);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("VERIFIED OFFICIAL RECEIPT", width / 2, height - 28, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedTextColor.r, mutedTextColor.g, mutedTextColor.b);
  doc.text(
    `This receipt is an official transaction record generated by Greek Stack on behalf of ${details.chapterName}.`,
    width / 2,
    height - 23,
    { align: "center" }
  );
  doc.text(
    `Verify online or reference Payment Hash: ${receiptHash} | Fingerprint: ${digitalFingerprint}`,
    width / 2,
    height - 18,
    { align: "center" }
  );

  // Return Node Buffer
  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}

/**
 * Generates and uploads a branded dues receipt PDF to Vercel Blob, returning the public URL.
 */
export async function generateAndUploadDuesReceipt(
  details: DuesReceiptDetails,
  filename: string
): Promise<string> {
  const pdfBuffer = generateDuesReceiptBuffer(details);
  
  // Clean filename to be safe for URL
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  
  const blob = await put(`receipts/${cleanFilename}.pdf`, pdfBuffer, {
    access: "public",
  });
  
  return blob.url;
}
