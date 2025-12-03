/**
 * Input Sanitization Utility
 * Prevents XSS attacks and invalid input injection
 */

const XSS_PATTERNS = {
  script: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  iframe: /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  eventHandler: /on\w+\s*=\s*["'][^"']*["']/gi,
  dataBinding: /\{\{[^}]*\}\}/g,
  htmlTags: /<[^>]*>/g,
  dangerousProtocols: /javascript:|data:|vbscript:|file:/gi
};

export class InputSanitizer {
  /**
   * Remove XSS attack vectors from user input
   */
  static sanitizeXSS(input: string): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input;

    // Remove script tags
    sanitized = sanitized.replace(XSS_PATTERNS.script, '');

    // Remove iframe tags
    sanitized = sanitized.replace(XSS_PATTERNS.iframe, '');

    // Remove event handlers
    sanitized = sanitized.replace(XSS_PATTERNS.eventHandler, '');

    // Remove dangerous protocols in URLs
    sanitized = sanitized.replace(XSS_PATTERNS.dangerousProtocols, '');

    return sanitized.trim();
  }

  /**
   * Validate and sanitize text input (names, titles, etc.)
   */
  static sanitizeText(input: string, maxLength: number = 500): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = this.sanitizeXSS(input);

    // Remove HTML tags
    sanitized = sanitized.replace(XSS_PATTERNS.htmlTags, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Truncate to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(input: string): string {
    if (!input || typeof input !== 'string') return '';

    const email = input.toLowerCase().trim();

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return '';
    }

    // Limit length
    if (email.length > 254) {
      return '';
    }

    // Remove potential XSS in email
    return this.sanitizeXSS(email);
  }

  /**
   * Sanitize form input for educational content
   */
  static sanitizeFormInput(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = this.sanitizeXSS(input);

    // Allow basic markdown characters but remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Truncate to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Validate URL inputs
   */
  static sanitizeURL(input: string): string {
    if (!input || typeof input !== 'string') return '';

    try {
      const url = new URL(input);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }

      return url.toString();
    } catch {
      return '';
    }
  }

  /**
   * Sanitize JSON-like content (for concept maps, etc.)
   */
  static sanitizeJSON(input: string): string {
    if (!input || typeof input !== 'string') return '{}';

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(input);

      // Re-stringify to ensure clean JSON
      return JSON.stringify(parsed);
    } catch {
      return '{}';
    }
  }

  /**
   * Sanitize markdown content
   */
  static sanitizeMarkdown(input: string, maxLength: number = 50000): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input;

    // Remove script tags and dangerous protocols
    sanitized = this.sanitizeXSS(sanitized);

    // Remove HTML tags but keep markdown syntax
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Truncate to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Validate file names
   */
  static sanitizeFileName(input: string, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') return 'document';

    let sanitized = input.toLowerCase().trim();

    // Remove special characters
    sanitized = sanitized.replace(/[^a-z0-9\s\-_]/g, '');

    // Replace spaces with hyphens
    sanitized = sanitized.replace(/\s+/g, '-');

    // Remove multiple hyphens
    sanitized = sanitized.replace(/-+/g, '-');

    // Remove leading/trailing hyphens
    sanitized = sanitized.replace(/^-+|-+$/g, '');

    // Truncate
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized || 'document';
  }

  /**
   * Batch sanitize an object of form inputs
   */
  static sanitizeFormData(
    data: Record<string, any>,
    schema: Record<string, 'text' | 'email' | 'url' | 'markdown' | 'json'>
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (!(key in schema)) continue;

      const type = schema[key];

      switch (type) {
        case 'email':
          sanitized[key] = this.sanitizeEmail(value);
          break;
        case 'url':
          sanitized[key] = this.sanitizeURL(value);
          break;
        case 'markdown':
          sanitized[key] = this.sanitizeMarkdown(value);
          break;
        case 'json':
          sanitized[key] = this.sanitizeJSON(value);
          break;
        case 'text':
        default:
          sanitized[key] = this.sanitizeText(value);
      }
    }

    return sanitized;
  }
}

/**
 * React hook for input sanitization in forms
 */
export const useSanitizedInput = (initialValue: string = '', type: 'text' | 'email' | 'url' | 'markdown' = 'text') => {
  const [value, setValue] = React.useState(initialValue);

  const handleChange = (newValue: string) => {
    let sanitized = newValue;

    switch (type) {
      case 'email':
        sanitized = InputSanitizer.sanitizeEmail(newValue);
        break;
      case 'url':
        sanitized = InputSanitizer.sanitizeURL(newValue);
        break;
      case 'markdown':
        sanitized = InputSanitizer.sanitizeMarkdown(newValue);
        break;
      case 'text':
      default:
        sanitized = InputSanitizer.sanitizeText(newValue);
    }

    setValue(sanitized);
  };

  return [value, handleChange] as const;
};

// Export for use
import React from 'react';
