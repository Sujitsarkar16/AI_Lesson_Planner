/**
 * DOCX Export Utility
 * Generates Microsoft Word documents from lesson plans
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  convertInchesToTwip,
  BorderStyle
} from 'docx';
import { getDocumentTypeLabel, LessonPlan } from '@/shared/types/document';

interface DOCXOptions {
  includeBranding?: boolean;
  watermark?: string;
  headerColor?: string;
  schoolLogo?: string;
}

export class DOCXExporter {
  /**
   * Export lesson plan to DOCX
   */
  async exportLessonPlan(plan: LessonPlan, options: DOCXOptions = {}): Promise<Blob> {
    const sections = [{
      properties: {},
      children: [
        ...this.createHeader(plan, options),
        ...this.createMetadata(plan),
        ...this.createContent(plan.content || ''),
        ...this.createFooter(plan, options)
      ]
    }];

    const doc = new Document({
      sections,
      creator: 'curriculamIQ',
      title: plan.title,
      description: `${plan.type || 'Document'} - ${plan.subject}`,
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 22
            },
            paragraph: {
              spacing: {
                after: 120,
                line: 276
              }
            }
          }
        }
      }
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Export multiple documents to a single DOCX
   */
  async exportBatch(plans: LessonPlan[], options: DOCXOptions = {}): Promise<Blob> {
    const sections = plans.map((plan, index) => ({
      properties: {
        page: {
          pageNumbers: {
            start: index === 0 ? 1 : undefined
          }
        }
      },
      children: [
        ...this.createHeader(plan, options),
        ...this.createMetadata(plan),
        ...this.createContent(plan.content || ''),
        ...this.createFooter(plan, options),
        ...(index < plans.length - 1 ? [this.createPageBreak()] : [])
      ]
    }));

    const doc = new Document({
      sections,
      creator: 'curriculamIQ',
      title: 'Batch Export'
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Download DOCX file
   */
  downloadDOCX(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Private helper methods
   */

  private createHeader(plan: LessonPlan, options: DOCXOptions): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Title
    paragraphs.push(
      new Paragraph({
        text: plan.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: 200
        },
        border: {
          bottom: {
            color: options.headerColor || '3b82f6',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        }
      })
    );

    // Type badge
    if (plan.type) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: getDocumentTypeLabel(plan.type),
              bold: true,
              color: options.headerColor || '3b82f6',
              size: 20
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 200
          }
        })
      );
    }

    return paragraphs;
  }

  private createMetadata(plan: LessonPlan): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    const metadata = [
      { label: 'Subject', value: plan.subject },
      { label: 'Grade', value: plan.grade },
      { label: 'Duration', value: plan.duration || 'N/A' },
      { label: 'Date Created', value: plan.dateCreated }
    ];

    // Create metadata table-like structure
    metadata.forEach(item => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${item.label}: `,
              bold: true,
              size: 22
            }),
            new TextRun({
              text: item.value,
              size: 22
            })
          ],
          spacing: {
            after: 100
          }
        })
      );
    });

    // Separator
    paragraphs.push(
      new Paragraph({
        text: '',
        spacing: {
          after: 200
        },
        border: {
          bottom: {
            color: 'CCCCCC',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        }
      })
    );

    return paragraphs;
  }

  private createContent(content: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        paragraphs.push(new Paragraph({ text: '' }));
        continue;
      }

      // Headers
      if (trimmedLine.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          })
        );
      } else if (trimmedLine.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          })
        );
      } else if (trimmedLine.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 }
          })
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Bullet points
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(2),
            bullet: {
              level: 0
            },
            spacing: { after: 100 }
          })
        );
      } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        // Bold text
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.replace(/\*\*/g, ''),
                bold: true
              })
            ],
            spacing: { after: 120 }
          })
        );
      } else if (trimmedLine.startsWith('_') && trimmedLine.endsWith('_')) {
        // Italic text
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.replace(/_/g, ''),
                italics: true
              })
            ],
            spacing: { after: 120 }
          })
        );
      } else {
        // Parse inline formatting
        const children = this.parseInlineFormatting(trimmedLine);
        paragraphs.push(
          new Paragraph({
            children,
            spacing: { after: 120 }
          })
        );
      }
    }

    return paragraphs;
  }

  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    let currentText = '';
    let isBold = false;
    let isItalic = false;
    let i = 0;

    while (i < text.length) {
      if (text[i] === '*' && text[i + 1] === '*') {
        if (currentText) {
          runs.push(new TextRun({ text: currentText, bold: isBold, italics: isItalic }));
          currentText = '';
        }
        isBold = !isBold;
        i += 2;
      } else if (text[i] === '_') {
        if (currentText) {
          runs.push(new TextRun({ text: currentText, bold: isBold, italics: isItalic }));
          currentText = '';
        }
        isItalic = !isItalic;
        i += 1;
      } else {
        currentText += text[i];
        i += 1;
      }
    }

    if (currentText) {
      runs.push(new TextRun({ text: currentText, bold: isBold, italics: isItalic }));
    }

    return runs.length > 0 ? runs : [new TextRun({ text })];
  }

  private createFooter(plan: LessonPlan, options: DOCXOptions): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Separator
    paragraphs.push(
      new Paragraph({
        text: '',
        spacing: { before: 400 },
        border: {
          top: {
            color: 'CCCCCC',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        }
      })
    );

    // Branding
    if (options.includeBranding !== false) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Generated by curriculamIQ',
              size: 18,
              color: '999999',
              italics: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 }
        })
      );
    }

    return paragraphs;
  }

  private createPageBreak(): Paragraph {
    return new Paragraph({
      text: '',
      pageBreakBefore: true
    });
  }

}

/**
 * Quick export function
 */
export async function exportToDOCX(
  plan: LessonPlan,
  options: DOCXOptions = {},
  download: boolean = true
): Promise<Blob> {
  const exporter = new DOCXExporter();
  const blob = await exporter.exportLessonPlan(plan, options);
  
  if (download) {
    exporter.downloadDOCX(blob, plan.title || 'document');
  }
  
  return blob;
}

/**
 * Export multiple documents
 */
export async function exportMultipleToDOCX(
  plans: LessonPlan[],
  options: DOCXOptions = {},
  filename: string = 'documents',
  download: boolean = true
): Promise<Blob> {
  const exporter = new DOCXExporter();
  const blob = await exporter.exportBatch(plans, options);
  
  if (download) {
    exporter.downloadDOCX(blob, filename);
  }
  
  return blob;
}
