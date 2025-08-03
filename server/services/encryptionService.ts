import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: Buffer | null = null;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate a random encryption salt for first-time setup
   */
  generateSalt(): string {
    return randomBytes(SALT_LENGTH).toString('hex');
  }

  /**
   * Derive the master key from the application salt and a fixed passphrase
   */
  private deriveMasterKey(salt: string): Buffer {
    if (!salt) {
      throw new Error('Encryption salt is required');
    }
    
    // Use a combination of salt and application identifier as passphrase
    const passphrase = `AABot-${salt}-${process.env.DATABASE_URL?.slice(-10) || 'default'}`;
    
    return createHash('sha256')
      .update(passphrase)
      .digest();
  }

  /**
   * Encrypt a sensitive value
   */
  encrypt(plaintext: string, salt: string): string {
    if (!plaintext) return '';
    
    try {
      const key = this.deriveMasterKey(salt);
      const iv = randomBytes(IV_LENGTH);
      
      const cipher = createCipheriv(ALGORITHM, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + encrypted data + auth tag
      const combined = iv.toString('hex') + encrypted + authTag.toString('hex');
      
      return combined;
    } catch (error) {
      console.error('[ENCRYPTION] Failed to encrypt value:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a sensitive value
   */
  decrypt(encryptedValue: string, salt: string): string {
    if (!encryptedValue) return '';
    
    try {
      const key = this.deriveMasterKey(salt);
      
      // Extract IV, encrypted data, and auth tag
      const iv = Buffer.from(encryptedValue.slice(0, IV_LENGTH * 2), 'hex');
      const authTag = Buffer.from(encryptedValue.slice(-TAG_LENGTH * 2), 'hex');
      const encrypted = encryptedValue.slice(IV_LENGTH * 2, -TAG_LENGTH * 2);
      
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('[ENCRYPTION] Failed to decrypt value:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Test encryption/decryption with a sample value
   */
  testEncryption(salt: string): boolean {
    try {
      const testValue = 'test-encryption-value';
      const encrypted = this.encrypt(testValue, salt);
      const decrypted = this.decrypt(encrypted, salt);
      
      return decrypted === testValue;
    } catch (error) {
      console.error('[ENCRYPTION] Test failed:', error);
      return false;
    }
  }
}

export const encryptionService = EncryptionService.getInstance();