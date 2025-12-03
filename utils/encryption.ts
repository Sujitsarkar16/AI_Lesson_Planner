/**
 * Encryption Utility
 * Protects sensitive user data in localStorage using Web Crypto API
 */

interface EncryptionResult {
  ciphertext: string;
  iv: string;
  salt: string;
  algorithm: string;
}

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 32; // 256-bit key for AES-256
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 128; // GCM auth tag

/**
 * Generate a random salt
 */
async function generateSalt(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV (Initialization Vector)
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive a key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 250000, // OWASP recommended
      hash: 'SHA-256'
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH * 8 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get encryption password (device-specific for client-side encryption)
 * In production, consider using a key derivation service
 */
function getEncryptionPassword(): string {
  // Fallback: Use device fingerprint + stored seed
  const stored = localStorage.getItem('_encryption_seed');
  if (stored) return stored;

  const seed = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
  localStorage.setItem('_encryption_seed', seed);
  return seed;
}

export class DataEncryption {
  /**
   * Encrypt sensitive data
   */
  static async encrypt(data: string): Promise<EncryptionResult> {
    try {
      const password = getEncryptionPassword();
      const salt = await generateSalt();
      const iv = generateIV();

      // Derive encryption key
      const key = await deriveKey(password, salt);

      // Encrypt the data
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(data);

      const cipherBuffer = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
        key,
        plaintext
      );

      // Convert to base64 for storage
      const ciphertext = this.bufferToBase64(new Uint8Array(cipherBuffer));
      const saltB64 = this.bufferToBase64(salt);
      const ivB64 = this.bufferToBase64(iv);

      return {
        ciphertext,
        iv: ivB64,
        salt: saltB64,
        algorithm: ALGORITHM
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decrypt(encrypted: EncryptionResult): Promise<string> {
    try {
      const password = getEncryptionPassword();

      // Convert from base64
      const salt = this.base64ToBuffer(encrypted.salt);
      const iv = this.base64ToBuffer(encrypted.iv);
      const ciphertext = this.base64ToBuffer(encrypted.ciphertext);

      // Derive the same key
      const key = await deriveKey(password, salt);

      // Decrypt the data
      const plainBuffer = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(plainBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt and store sensitive data in localStorage
   */
  static async encryptAndStore(key: string, value: any): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      const encrypted = await this.encrypt(jsonString);

      localStorage.setItem(key, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to encrypt and store data:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt sensitive data from localStorage
   */
  static async retrieveAndDecrypt<T>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const encrypted: EncryptionResult = JSON.parse(stored);
      const decrypted = await this.decrypt(encrypted);

      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Failed to retrieve and decrypt data:', error);
      return null;
    }
  }

  /**
   * Hash sensitive strings (one-way, for comparison)
   */
  static async hashString(input: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);

      return this.bufferToBase64(new Uint8Array(hashBuffer));
    } catch (error) {
      console.error('Hash failed:', error);
      throw new Error('Failed to hash string');
    }
  }

  /**
   * Convert Uint8Array to Base64 string
   */
  private static bufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to Uint8Array
   */
  private static base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Clear encryption seed (for logout or reset)
   */
  static clearEncryptionSeed(): void {
    localStorage.removeItem('_encryption_seed');
  }
}

/**
 * Encrypted localStorage wrapper for sensitive data
 */
export class EncryptedStorage {
  /**
   * Set encrypted value
   */
  static async set(key: string, value: any): Promise<void> {
    await DataEncryption.encryptAndStore(key, value);
  }

  /**
   * Get encrypted value
   */
  static async get<T>(key: string): Promise<T | null> {
    return DataEncryption.retrieveAndDecrypt<T>(key);
  }

  /**
   * Remove encrypted value
   */
  static remove(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Check if encrypted key exists
   */
  static has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Clear all encrypted values by prefix
   */
  static clearByPrefix(prefix: string): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}
