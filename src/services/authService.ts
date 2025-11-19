import { UserRole, AuthSession } from '../types/auth';
import { apiService } from './apiService';

class AuthService {
  private currentSession: AuthSession | null = null;

  async login(identifier: string, passwordOrPin: string, twoFactorCode?: string): Promise<AuthSession> {
    try {
      console.log('Login attempt:', { identifier, hasPassword: !!passwordOrPin });
      
      // Use API service for login
      const response = await apiService.login(identifier, passwordOrPin);
      
      if (!response.success) {
        throw new Error(response.message || 'Invalid credentials');
      }
      
      const user = response.user;
      const token = response.token;
      const pinResetRequired = response.pinResetRequired || false;
      
      console.log('Login successful:', user.name, 'PIN reset required:', pinResetRequired);
      
      // Create session
      const session: AuthSession = {
        userId: user.id,
        role: user.role as UserRole,
        token: token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        pinResetRequired: pinResetRequired
      };
      
      this.currentSession = session;
      localStorage.setItem('authSession', JSON.stringify(session));
      
      return session;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.currentSession = null;
    localStorage.removeItem('authSession');
    await apiService.logout();
  }

  getCurrentSession(): AuthSession | null {
    // Try to restore from localStorage
    if (!this.currentSession) {
      const stored = localStorage.getItem('authSession');
      if (stored) {
        try {
          this.currentSession = JSON.parse(stored);
        } catch (e) {
          localStorage.removeItem('authSession');
        }
      }
    }
    return this.currentSession;
  }

  updateSession(session: AuthSession): void {
    this.currentSession = session;
    localStorage.setItem('authSession', JSON.stringify(session));
  }

  isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;
    return session.expiresAt > new Date();
  }

  hasRole(role: UserRole): boolean {
    return this.getCurrentSession()?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const session = this.getCurrentSession();
    return session ? roles.includes(session.role) : false;
  }

  // 2FA Setup for Director (placeholder - implement with speakeasy later)
  async setup2FA(userId: number): Promise<{ secret: string; qrCode: string }> {
    // In production, use speakeasy or similar
    const secret = Math.random().toString(36).substring(2, 15);
    const qrCode = `otpauth://totp/Matsplash:${userId}?secret=${secret}&issuer=Matsplash`;
    return { secret, qrCode };
  }
}

export const authService = new AuthService();
