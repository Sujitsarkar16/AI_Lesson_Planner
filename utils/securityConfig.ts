/**
 * Security Configuration
 * Centralized security settings for the application
 */

export const SecurityConfig = {
  // Rate Limiting Configuration
  rateLimiting: {
    contentGeneration: {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      storageKey: 'ai_content_gen_limit'
    },
    imageGeneration: {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
      storageKey: 'ai_image_gen_limit'
    },
    totalRequests: {
      maxRequests: 20,
      windowMs: 60 * 60 * 1000, // 1 hour
      storageKey: 'ai_total_limit'
    }
  },

  // Input Sanitization Limits
  sanitization: {
    maxLengths: {
      text: 500,
      title: 100,
      email: 254,
      url: 2048,
      markdown: 50000,
      fileName: 255,
      schoolName: 100,
      teacherName: 100,
      subject: 100,
      grade: 50,
      topic: 100,
      formInput: 1000
    },
    patterns: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\//,
      phoneNumber: /^\+?[\d\s\-\(\)]{10,}$/
    }
  },

  // Encryption Settings
  encryption: {
    algorithm: 'AES-GCM',
    keyLength: 32, // 256-bit
    saltLength: 16,
    ivLength: 12,
    tagLength: 128,
    iterations: 250000 // PBKDF2 iterations
  },

  // Data Storage
  localStorage: {
    keys: {
      savedPlans: 'savedPlans',
      userSettings: 'userSettings',
      encryptionSeed: '_encryption_seed',
      rateLimitContent: 'ai_content_gen_limit',
      rateLimitImage: 'ai_image_gen_limit',
      theme: 'theme'
    },
    encryptedKeys: {
      // Mark which localStorage keys should be encrypted
      userSettings: true,
      'plan_*': true
    }
  },

  // Security Headers (for future API calls)
  apiHeaders: {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  },

  // Allowed file types for uploads (future)
  allowedFileTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ],
  maxFileSize: 5 * 1024 * 1024, // 5MB

  // Security warnings
  warnings: {
    rateLimitThreshold: 0.75, // Warn at 75% of limit
    showSecurityAlerts: true,
    encryptionRequired: true
  }
};

/**
 * Get rate limiting config for a specific operation
 */
export const getRateLimitConfig = (operation: 'content' | 'image' | 'total') => {
  return SecurityConfig.rateLimiting[`${operation}Generation` as keyof typeof SecurityConfig.rateLimiting];
};

/**
 * Get sanitization max length for a field
 */
export const getSanitizationLimit = (field: keyof typeof SecurityConfig.sanitization.maxLengths) => {
  return SecurityConfig.sanitization.maxLengths[field] || 500;
};

/**
 * Check if localStorage key should be encrypted
 */
export const shouldEncrypt = (key: string): boolean => {
  const encryptedKeys = SecurityConfig.localStorage.encryptedKeys;
  
  for (const [pattern, shouldEncr] of Object.entries(encryptedKeys)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(key) && shouldEncr) return true;
    } else if (key === pattern && shouldEncr) {
      return true;
    }
  }
  
  return false;
};
