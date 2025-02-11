import { Buffer } from 'buffer';

export class EncryptionService {
  private readonly key: string;

  constructor() {
    // In production, this should be an environment variable
    // For now, we'll use a constant key for development
    this.key = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'your-32-byte-secret-key-here-12345';
  }

  encrypt(text: string): string {
    try {
      // Simple encryption for development - replace with proper encryption in production
      const buffer = Buffer.from(text, 'utf8');
      return buffer.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedText: string): string {
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
