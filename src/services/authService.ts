import { User, UserRole, AuthSession } from '../types/auth';
import { dbService } from './database';

class AuthService {
  private currentSession: AuthSession | null = null;

  async login(identifier: string, passwordOrPin: string, twoFactorCode?: string): Promise<AuthSession> {
    // Find user by phone or email
    let user: User | null = null;
    
    if (identifier.includes('@')) {
      // Try to find by email
      const users = await dbService.getUsers();
      user = users.find(u => u.email === identifier) || null;
    } else {
      // Try to find by phone
      user = await dbService.getUserByPhone(identifier);
    }

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Verify password/PIN
    if (user.role === 'director') {
      // Director uses password
      if (user.password !== passwordOrPin) { // In production, use bcrypt
        throw new Error('Invalid password');
      }
      
      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          throw new Error('2FA code required');
        }
        // In production, verify TOTP code
        // For now, accept any 6-digit code
        if (!/^\d{6}$/.test(twoFactorCode)) {
          throw new Error('Invalid 2FA code');
        }
      }
    } else {
      // Other roles use PIN
      if (user.pin !== passwordOrPin) {
        throw new Error('Invalid PIN');
      }
    }

    // Create session
    const session: AuthSession = {
      userId: user.id!,
      role: user.role,
      token: this.generateToken(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    this.currentSession = session;

    // Update last login
    await dbService.updateUser(user.id!, { lastLogin: new Date() });

    return session;
  }

  async logout(): Promise<void> {
    this.currentSession = null;
  }

  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    if (!this.currentSession) return false;
    return this.currentSession.expiresAt > new Date();
  }

  hasRole(role: UserRole): boolean {
    return this.currentSession?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return this.currentSession ? roles.includes(this.currentSession.role) : false;
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // 2FA Setup for Director
  async setup2FA(userId: number): Promise<{ secret: string; qrCode: string }> {
    // In production, use speakeasy or similar
    const secret = Math.random().toString(36).substring(2, 15);
    const qrCode = `otpauth://totp/Matsplash:${userId}?secret=${secret}&issuer=Matsplash`;
    
    await dbService.updateUser(userId, {
      twoFactorSecret: secret,
      twoFactorEnabled: true
    });

    return { secret, qrCode };
  }
}

export const authService = new AuthService();

