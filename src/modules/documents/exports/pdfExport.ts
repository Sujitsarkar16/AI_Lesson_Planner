/**
 * PDF Export Utility
 * Generates professional PDF documents from lesson plans
 */

import jsPDF from 'jspdf';
import { getDocumentTypeLabel, LessonPlan } from '@/shared/types/document';

interface PDFOptions {
  includeBranding?: boolean;
  watermark?: string;
  headerColor?: string;
  footerText?: string;
}

export class PDFExporter {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Export lesson plan to PDF
   */
  async exportLessonPlan(plan: LessonPlan, options: PDFOptions = {}): Promise<Blob> {
    this.currentY = this.margin;

    // Add header
    this.addHeader(plan, options);

    // Add metadata
    this.addMetadata(plan);

    // Add content
    this.addContent(plan.content || '');

    // Add footer
    this.addFooter(options);

    // Return as blob
    return this.doc.output('blob');
  }

  /**
   * Export multiple documents to a single PDF
   */
  async exportBatch(plans: LessonPlan[], options: PDFOptions = {}): Promise<Blob> {
    for (let i = 0; i < plans.length; i++) {
      if (i > 0) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.addHeader(plans[i], options);
      this.addMetadata(plans[i]);
      this.addContent(plans[i].content || '');
      this.addFooter(options);
    }

    return this.doc.output('blob');
  }

  /**
   * Download PDF file
   */
  downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Private helper methods
   */

  private addHeader(plan: LessonPlan, options: PDFOptions) {
    const headerColor = options.headerColor || '#3b82f6';
    
    // Header background
    this.doc.setFillColor(headerColor);
    this.doc.rect(0, 0, this.pageWidth, 40, 'F');

    // Title
    this.doc.setFontSize(24);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    const title = this.truncateText(plan.title, 50);
    this.doc.text(title, this.margin, 25);

    // Type badge
    if (plan.type) {
      const typeLabel = getDocumentTypeLabel(plan.type);
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      const badgeWidth = this.doc.getTextWidth(typeLabel) + 10;
      this.doc.setFillColor(255, 255, 255);
      this.doc.roundedRect(this.pageWidth - this.margin - badgeWidth, 17, badgeWidth, 8, 2, 2, 'F');
      this.doc.setTextColor(headerColor);
      this.doc.text(typeLabel, this.pageWidth - this.margin - badgeWidth + 5, 22);
    }

    this.currentY = 50;
    this.doc.setTextColor(0, 0, 0);
  }

  private addMetadata(plan: LessonPlan) {
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    const metadata = [
      { label: 'Subject', value: plan.subject },
      { label: 'Grade', value: plan.grade },
      { label: 'Duration', value: plan.duration || 'N/A' },
      { label: 'Date Created', value: plan.dateCreated }
    ];

    let xPos = this.margin;
    const itemWidth = (this.pageWidth - 2 * this.margin) / 4;

    metadata.forEach((item, index) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(item.label + ':', xPos, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(item.value, xPos, this.currentY + 5);
      xPos += itemWidth;
    });

    this.currentY += 20;

    // Add separator line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  private addContent(content: string) {
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');

    // Parse markdown-like content and add to PDF
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (this.currentY > this.pageHeight - 30) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      const trimmedLine = line.trim();

      // Headers
      if (trimmedLine.startsWith('# ')) {
        this.doc.setFontSize(18);
        this.doc.setFont('helvetica', 'bold');
        this.addText(trimmedLine.substring(2), this.currentY);
        this.currentY += 8;
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'normal');
      } else if (trimmedLine.startsWith('## ')) {
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.addText(trimmedLine.substring(3), this.currentY);
        this.currentY += 7;
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'normal');
      } else if (trimmedLine.startsWith('### ')) {
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.addText(trimmedLine.substring(4), this.currentY);
        this.currentY += 6;
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'normal');
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Bullet points
        this.doc.text('•', this.margin + 5, this.currentY);
        this.addText(trimmedLine.substring(2), this.currentY, this.margin + 10);
        this.currentY += 5;
      } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        // Bold text
        this.doc.setFont('helvetica', 'bold');
        this.addText(trimmedLine.replace(/\*\*/g, ''), this.currentY);
        this.currentY += 5;
        this.doc.setFont('helvetica', 'normal');
      } else if (trimmedLine) {
        // Regular text
        this.addText(trimmedLine, this.currentY);
        this.currentY += 5;
      } else {
        // Empty line
        this.currentY += 3;
      }
    }
  }

  private addText(text: string, y: number, x: number = this.margin) {
    const maxWidth = this.pageWidth - 2 * this.margin;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string, index: number) => {
      if (y + (index * 5) > this.pageHeight - 30) {
        this.doc.addPage();
        y = this.margin;
        this.currentY = this.margin;
      }
      this.doc.text(line, x, y + (index * 5));
    });

    if (lines.length > 1) {
      this.currentY += (lines.length - 1) * 5;
    }
  }

  private addFooter(options: PDFOptions) {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer line
      this.doc.setDrawColor(200, 200, 200);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);
      
      // Page number
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(120, 120, 120);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );

      // Custom footer text
      if (options.footerText) {
        this.doc.text(options.footerText, this.margin, this.pageHeight - 10);
      }

      // Watermark for free tier
      if (options.watermark) {
        this.doc.setFontSize(40);
        this.doc.setTextColor(220, 220, 220);
        this.doc.text(
          options.watermark,
          this.pageWidth / 2,
          this.pageHeight / 2,
          { align: 'center', angle: 45 }
        );
      }

      // Branding
      if (options.includeBranding !== false) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(150, 150, 150);
        this.doc.text(
          'Generated by curriculamIQ',
          this.pageWidth - this.margin,
          this.pageHeight - 10,
          { align: 'right' }
        );
      }
    }
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

}

/**
 * Quick export function
 */
export async function exportToPDF(
  plan: LessonPlan,
  options: PDFOptions = {},
  download: boolean = true
): Promise<Blob> {
  const exporter = new PDFExporter();
  const blob = await exporter.exportLessonPlan(plan, options);
  
  if (download) {
    exporter.downloadPDF(blob, plan.title || 'document');
  }
  
  return blob;
}

/**
 * Export multiple documents
 */
export async function exportMultipleToPDF(
  plans: LessonPlan[],
  options: PDFOptions = {},
  filename: string = 'documents',
  download: boolean = true
): Promise<Blob> {
  const exporter = new PDFExporter();
  const blob = await exporter.exportBatch(plans, options);
  
  if (download) {
    exporter.downloadPDF(blob, filename);
  }
  
  return blob;
}
