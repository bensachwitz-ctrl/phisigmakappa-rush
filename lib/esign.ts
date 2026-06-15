import { jsPDF } from "jspdf";
import { put } from "@vercel/blob";
import crypto from "crypto";

interface SigneeDetails {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  organization?: string;
  documentTitle?: string;
  consentText?: string;
}

/**
 * Generates a signed confirmation PDF certificate using jsPDF.
 */
export function generateSignedPdfBuffer(details: SigneeDetails): Buffer {
  // Create PDF in standard A4 size (210 x 297 mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Premium colors
  const primaryColor = { r: 15, g: 23, b: 42 }; // Dark Slate (#0f172a)
  const accentColor = { r: 180, g: 83, b: 9 }; // Amber / Gold (#b45309)
  const mutedTextColor = { r: 100, g: 116, b: 139 }; // Slate-500 (#64748b)

  // 1. Draw elegant outer double border
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(1.0);
  doc.rect(8, 8, width - 16, height - 16);

  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
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
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  drawCornerBrackets(12, 12, 6);

  // 2. Header
  const orgName = details.organization || "Greek Stack";
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(orgName.toUpperCase(), width / 2, 22, { align: "center" });

  // Divider line
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(0.5);
  doc.line(30, 26, width - 30, 26);

  // Accent ornament
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(1.5);
  doc.line(width / 2 - 10, 26, width / 2 + 10, 26);

  // Title
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const docTitle = details.documentTitle || "Digital Signature Certificate";
  doc.text(docTitle, width / 2, 40, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(mutedTextColor.r, mutedTextColor.g, mutedTextColor.b);
  doc.text("Legally Binding E-Signature Record", width / 2, 47, { align: "center" });

  // Generate verification code
  const timestamp = new Date().toISOString();
  const rawFingerprint = `${details.name}|${details.email}|${details.ipAddress || "no-ip"}|${timestamp}`;
  const fingerprint = crypto.createHash("sha256").update(rawFingerprint).digest("hex").substring(0, 32).toUpperCase();

  // 3. Information Blocks
  let y = 60;

  const drawSectionHeader = (title: string, currentY: number) => {
    doc.setFillColor(248, 250, 252); // Very light grey bg
    doc.rect(15, currentY - 5, width - 30, 8, "F");
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 18, currentY);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(15, currentY + 3, width - 15, currentY + 3);
    return currentY + 12;
  };

  // Section: Signee Details
  y = drawSectionHeader("SIGNEE DETAILS", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("Full Name:", 20, y);
  doc.text("Email Address:", 20, y + 8);
  if (details.phone) {
    doc.text("Phone Number:", 20, y + 16);
  }

  doc.setFont("helvetica", "normal");
  doc.text(details.name, 55, y);
  doc.text(details.email, 55, y + 8);
  if (details.phone) {
    doc.text(details.phone, 55, y + 16);
  }

  y += details.phone ? 26 : 18;

  // Section: Statement of Consent & Agreement
  y = drawSectionHeader("LEGAL STATEMENT & AGREEMENT", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);

  const defaultConsentText = 
    "I hereby declare my acceptance of membership (bid) and certify that I have read and agree to all terms and conditions, including the Zero-Tolerance Anti-Hazing Agreement. I understand that hazing is strictly prohibited and that my digital signature constitutes a legally binding acceptance of these terms.";
  
  const textLines = doc.splitTextToSize(details.consentText || defaultConsentText, width - 40);
  doc.text(textLines, 20, y);
  
  // Calculate text height
  const lineHeight = 5;
  y += (textLines.length * lineHeight) + 6;

  // Section: E-Signature Metadata
  y = drawSectionHeader("E-SIGNATURE METADATA & FORENSICS", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Consent Signature:", 20, y);
  doc.text("Signing Date/Time:", 20, y + 7);
  doc.text("IP Address:", 20, y + 14);
  if (details.userAgent) {
    doc.text("User Agent:", 20, y + 21);
  }
  doc.text("Verification Hash:", 20, y + (details.userAgent ? 28 : 21));

  doc.setFont("helvetica", "normal");
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setFont("courier", "bold");
  doc.text(`/s/ ${details.name}`, 58, y);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setFont("helvetica", "normal");
  doc.text(timestamp, 58, y + 7);
  doc.text(details.ipAddress || "Unavailable", 58, y + 14);
  if (details.userAgent) {
    const uaLines = doc.splitTextToSize(details.userAgent, width - 80);
    doc.text(uaLines, 58, y + 21);
    y += (uaLines.length - 1) * 4;
  }
  doc.setFont("courier", "bold");
  doc.text(fingerprint, 58, y + (details.userAgent ? 28 : 21));

  y += details.userAgent ? 38 : 31;

  // 4. Verification Footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, height - 35, width - 20, height - 35);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("VERIFICATION NOTICE", width / 2, height - 28, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedTextColor.r, mutedTextColor.g, mutedTextColor.b);
  doc.text(
    "This document is a certified record of a digital signature collected under ESIGN Act standards. For validation, audit or inquiry,",
    width / 2,
    height - 23,
    { align: "center" }
  );
  doc.text(
    `please refer to Organization records referencing Hash: ${fingerprint}`,
    width / 2,
    height - 19,
    { align: "center" }
  );

  // Return Node Buffer
  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}

/**
 * Generates and uploads a signed PDF certificate to Vercel Blob, returning the public URL.
 */
export async function generateAndUploadSignedPdf(
  details: SigneeDetails,
  filename: string
): Promise<string> {
  const pdfBuffer = generateSignedPdfBuffer(details);
  
  // Clean filename to be safe for URL
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  
  const blob = await put(`esignatures/${cleanFilename}.pdf`, pdfBuffer, {
    access: "public",
  });
  
  return blob.url;
}
