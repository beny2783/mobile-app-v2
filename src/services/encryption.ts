import { Buffer } from 'buffer';

export class EncryptionService {
  private readonly key: string;

  constructor() {
    this.key = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'your-32-byte-secret-key-here-12345';
    if (!this.key) {
      throw new Error('Encryption key not found in environment variables');
    }
  }

  encrypt(text: string | null): string | null {
    if (!text) return null;

    try {
      // Simple encryption for development - replace with proper encryption in production
      const buffer = Buffer.from(text, 'utf8');
      return buffer.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedText: string | null): string | null {
    if (!encryptedText) return null;

    try {
      // Simple decryption for development
      const buffer = Buffer.from(encryptedText, 'base64');
      return buffer.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
}
