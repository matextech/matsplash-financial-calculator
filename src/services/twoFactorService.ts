import { TOTP, URI } from 'otpauth';
import QRCode from 'qrcode';

export interface TwoFactorSetup {
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

class TwoFactorService {
  /**
   * Generate a new 2FA secret and QR code for a user
   */
  async generateSecret(userId: number, userEmail: string, issuer: string = 'MatSplash'): Promise<TwoFactorSetup> {
    // Generate a random secret (32 characters base32)
    const secret = this.generateRandomSecret();
    
    // Create TOTP instance
    const totp = new TOTP({
      issuer: issuer,
      label: userEmail || `User-${userId}`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    // Generate QR code URI
    const uri = totp.toString();
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(uri);
    
    // Get manual entry key (base32 secret)
    const manualEntryKey = secret;

    return {
      secret: secret,
      qrCodeDataUrl: qrCodeDataUrl,
      manualEntryKey: manualEntryKey,
    };
  }

  /**
   * Verify a TOTP code against a secret
   */
  verifyCode(secret: string, code: string, window: number = 1): boolean {
    try {
      const totp = new TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      // Verify the code (window allows for clock skew)
      const delta = totp.validate({ token: code, window: window });
      return delta !== null;
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  }

  /**
   * Generate a random base32 secret
   */
  private generateRandomSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 alphabet
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Format secret for manual entry (add spaces every 4 characters)
   */
  formatSecretForDisplay(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }
}

export const twoFactorService = new TwoFactorService();

