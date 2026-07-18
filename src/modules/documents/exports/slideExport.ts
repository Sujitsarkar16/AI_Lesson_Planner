/**
 * Slide Export Utility
 * Converts lesson plans to slide deck formats (Reveal.js, Markdown slides)
 */

import { LessonPlan } from '@/shared/types/document';

interface Slide {
  title: string;
  content: string;
  notes?: string;
  layout?: 'title' | 'content' | 'two-column' | 'image';
}

/**
 * Parse lesson plan content into slides
 */
export function parseContentToSlides(content: string): Slide[] {
  const slides: Slide[] = [];
  
  // Split by H2 headers (##)
  const sections = content.split(/^##\s+/m).filter(s => s.trim());
  
  sections.forEach((section, index) => {
    const lines = section.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    
    // First section is usually the title slide
    if (index === 0 && (title.toLowerCase().includes('lesson') || title.toLowerCase().includes('topic'))) {
      slides.push({
        title: title,
        content: body,
        layout: 'title'
      });
    } else {
      // Check if content has bullet points or is paragraph-based
      const hasBullets = body.includes('- ') || body.includes('* ') || body.includes('1. ');
      
      slides.push({
        title: title,
        content: body,
        layout: hasBullets ? 'content' : 'content'
      });
    }
  });
  
  return slides;
}

/**
 * Convert to Reveal.js HTML format
 */
export function exportAsRevealJS(lessonPlan: LessonPlan): string {
  const slides = parseContentToSlides(lessonPlan.content || '');
  
  const slideHTML = slides.map(slide => {
    if (slide.layout === 'title') {
      return `
    <section data-background-gradient="linear-gradient(to bottom, #7c3aed, #a855f7)">
      <h1 style="color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${slide.title}</h1>
      <p style="color: white; font-size: 1.2em;">${lessonPlan.subject} • ${lessonPlan.grade}</p>
    </section>`;
    } else {
      return `
    <section>
      <h2>${slide.title}</h2>
      <div style="text-align: left; font-size: 0.8em;">
        ${markdownToHTML(slide.content)}
      </div>
    </section>`;
    }
  }).join('\n');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lessonPlan.title} - Lesson Slides</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/white.css">
  <style>
    .reveal h1, .reveal h2, .reveal h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
    }
    .reveal {
      font-family: 'Inter', sans-serif;
    }
    .reveal ul, .reveal ol {
      text-align: left;
    }
    .reveal section {
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
${slideHTML}
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      slideNumber: 'c/t',
      transition: 'slide',
      controls: true,
      progress: true,
      center: true,
      touch: true
    });
  </script>
</body>
</html>`;
}

/**
 * Convert to Markdown slides format (compatible with Marp, Slidev)
 */
export function exportAsMarkdownSlides(lessonPlan: LessonPlan): string {
  const slides = parseContentToSlides(lessonPlan.content || '');
  
  let markdown = `---
marp: true
theme: default
paginate: true
backgroundColor: #fff
---

<!-- _class: lead -->
# ${lessonPlan.title}

**${lessonPlan.subject}** • **${lessonPlan.grade}**

${lessonPlan.metadata?.teacher ? `Teacher: ${lessonPlan.metadata.teacher}` : ''}
${lessonPlan.metadata?.date ? `Date: ${lessonPlan.metadata.date}` : ''}

---

`;

  slides.forEach((slide, index) => {
    // Skip if first slide (already added as title)
    if (index === 0 && slide.layout === 'title') return;
    
    markdown += `## ${slide.title}\n\n`;
    markdown += `${slide.content}\n\n`;
    markdown += `---\n\n`;
  });
  
  return markdown;
}

/**
 * Convert to Google Slides compatible format (HTML that can be imported)
 */
export function exportAsGoogleSlidesHTML(lessonPlan: LessonPlan): string {
  const slides = parseContentToSlides(lessonPlan.content || '');
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${lessonPlan.title}</title>
  <style>
    body { font-family: Arial, sans-serif; }
    .slide { 
      page-break-after: always; 
      width: 960px; 
      height: 540px; 
      padding: 40px; 
      margin: 20px auto;
      border: 1px solid #ccc;
      box-sizing: border-box;
    }
    .title-slide { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    h1 { font-size: 48px; margin: 0; }
    h2 { font-size: 36px; color: #333; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
    ul, ol { font-size: 20px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="slide title-slide">
    <h1>${lessonPlan.title}</h1>
    <p style="font-size: 24px;">${lessonPlan.subject} • ${lessonPlan.grade}</p>
  </div>
`;

  slides.forEach((slide, index) => {
    if (index === 0 && slide.layout === 'title') return;
    
    html += `
  <div class="slide">
    <h2>${slide.title}</h2>
    ${markdownToHTML(slide.content)}
  </div>
`;
  });
  
  html += `
</body>
</html>`;
  
  return html;
}

/**
 * Simple markdown to HTML converter
 */
function markdownToHTML(markdown: string): string {
  let html = markdown;
  
  // Headers (already handled at section level, so convert H3+)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Unordered lists
  html = html.replace(/^\s*[-*]\s+(.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.+)$/gim, '<li>$1</li>');
  
  // Paragraphs
  html = html.replace(/^(?!<[uo]l>|<li>|<h[1-6]>)(.+)$/gim, '<p>$1</p>');
  
  // Line breaks
  html = html.replace(/\n\n/g, '<br><br>');
  
  return html;
}

/**
 * Download slide deck as file
 */
export function downloadSlides(content: string, filename: string, format: 'html' | 'md' = 'html') {
  const blob = new Blob([content], { type: format === 'html' ? 'text/html' : 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function with multiple format options
 */
export function exportLessonAsSlides(
  lessonPlan: LessonPlan,
  format: 'reveal' | 'markdown' | 'google' = 'reveal'
): void {
  let content: string;
  let filename = lessonPlan.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  
  switch (format) {
    case 'reveal':
      content = exportAsRevealJS(lessonPlan);
      downloadSlides(content, `${filename}-slides`, 'html');
      break;
    case 'markdown':
      content = exportAsMarkdownSlides(lessonPlan);
      downloadSlides(content, `${filename}-slides`, 'md');
      break;
    case 'google':
      content = exportAsGoogleSlidesHTML(lessonPlan);
      downloadSlides(content, `${filename}-slides`, 'html');
      break;
  }
}
