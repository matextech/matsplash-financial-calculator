import { UserRole, AuthSession } from '../types/auth';
import { apiService } from './apiService';

class AuthService {
  private currentSession: AuthSession | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime: number = Date.now();

  // Security settings for managers and directors
  private readonly HIGH_SECURITY_ROLES: UserRole[] = ['manager', 'director'];
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes maximum inactivity
  private readonly SESSION_CHECK_INTERVAL = 1 * 60 * 1000; // Check every 1 minute for better security
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes maximum session timeout

  async login(identifier: string, passwordOrPin: string, twoFactorCode?: string): Promise<AuthSession> {
    try {
      console.log('Login attempt:', { identifier, hasPassword: !!passwordOrPin, has2FA: !!twoFactorCode });
      
      // Check for rate limiting (prevent brute force)
      const loginAttempts = this.getLoginAttempts(identifier);
      if (loginAttempts.count >= 5) {
        const timeSinceFirstAttempt = Date.now() - loginAttempts.firstAttempt;
        if (timeSinceFirstAttempt < 15 * 60 * 1000) { // 15 minute lockout
          const remainingMinutes = Math.ceil((15 * 60 * 1000 - timeSinceFirstAttempt) / (60 * 1000));
          throw new Error(`Too many login attempts. Please try again in ${remainingMinutes} minute(s).`);
        } else {
          // Reset attempts after lockout period
          this.clearLoginAttempts(identifier);
        }
      }
      
      // Use API service for login
      let response;
      try {
        response = await apiService.login(identifier, passwordOrPin, twoFactorCode);
      } catch (error: any) {
        // Check if 2FA is required
        if (error.requires2FA) {
          const twoFactorError: any = new Error('2FA code required');
          twoFactorError.requires2FA = true;
          throw twoFactorError;
        }
        // Record failed attempt
        this.recordLoginAttempt(identifier, false);
        throw error;
      }
      
      if (!response.success) {
        // Record failed attempt
        this.recordLoginAttempt(identifier, false);
        throw new Error(response.message || 'Invalid credentials');
      }
      
      const user = response.user;
      const token = response.token;
      const pinResetRequired = response.pinResetRequired || false;
      
      // Check if user is manager or director - require stricter security
      const isHighSecurity = this.HIGH_SECURITY_ROLES.includes(user.role as UserRole);
      
      console.log('Login successful:', user.name, 'PIN reset required:', pinResetRequired, 'High security:', isHighSecurity);
      
      // Clear successful login attempts
      this.clearLoginAttempts(identifier);
      
      // Create session with 5 minute timeout for all users (maximum security)
      const sessionTimeout = this.SESSION_TIMEOUT; // 5 minutes for all users
      const session: AuthSession = {
        userId: user.id,
        role: user.role as UserRole,
        token: token,
        expiresAt: new Date(Date.now() + sessionTimeout),
        pinResetRequired: pinResetRequired,
        lastActivity: new Date()
      };
      
      this.currentSession = session;
      this.lastActivityTime = Date.now();
      localStorage.setItem('authSession', JSON.stringify(session));
      
      // Set up security monitoring for managers and directors
      if (isHighSecurity) {
        this.setupSecurityMonitoring();
      }
      
      return session;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  private setupSecurityMonitoring(): void {
    // Clear existing timers
    this.clearSecurityMonitoring();
    
    // Set up inactivity monitoring
    this.setupInactivityMonitoring();
    
    // Set up session validation
    this.setupSessionValidation();
  }

  private setupInactivityMonitoring(): void {
    // Reset activity on user interaction
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const resetActivity = () => {
      this.lastActivityTime = Date.now();
      if (this.currentSession) {
        this.currentSession.lastActivity = new Date();
        localStorage.setItem('authSession', JSON.stringify(this.currentSession));
      }
    };

    events.forEach(event => {
      document.addEventListener(event, resetActivity, true);
    });

    // Check for inactivity
    this.inactivityTimer = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      if (timeSinceActivity >= this.INACTIVITY_TIMEOUT) {
        console.warn('Inactivity timeout - logging out');
        this.logout();
        window.location.href = '/login?reason=inactivity';
      }
    }, 60000); // Check every minute
  }

  private setupSessionValidation(): void {
    // Periodically validate session with backend
    this.sessionCheckInterval = setInterval(async () => {
      if (!this.currentSession) return;
      
      const isHighSecurity = this.HIGH_SECURITY_ROLES.includes(this.currentSession.role);
      if (!isHighSecurity) return;

      try {
        // Verify token is still valid
        const isValid = await apiService.verifyToken();
        if (!isValid || !isValid.success) {
          console.warn('Session validation failed - logging out');
          this.logout();
          window.location.href = '/login?reason=session_expired';
        } else {
          // Update last activity
          this.lastActivityTime = Date.now();
          if (this.currentSession) {
            this.currentSession.lastActivity = new Date();
            localStorage.setItem('authSession', JSON.stringify(this.currentSession));
          }
        }
      } catch (error) {
        console.error('Session validation error:', error);
        this.logout();
        window.location.href = '/login?reason=session_error';
      }
    }, this.SESSION_CHECK_INTERVAL);
  }

  private clearSecurityMonitoring(): void {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  private getLoginAttempts(identifier: string): { count: number; firstAttempt: number } {
    const key = `loginAttempts_${identifier}`;
    const stored = localStorage.getItem(key);
    if (!stored) return { count: 0, firstAttempt: Date.now() };
    return JSON.parse(stored);
  }

  private recordLoginAttempt(identifier: string, success: boolean): void {
    if (success) {
      this.clearLoginAttempts(identifier);
      return;
    }

    const key = `loginAttempts_${identifier}`;
    const attempts = this.getLoginAttempts(identifier);
    attempts.count += 1;
    if (attempts.count === 1) {
      attempts.firstAttempt = Date.now();
    }
    localStorage.setItem(key, JSON.stringify(attempts));
  }

  private clearLoginAttempts(identifier: string): void {
    const key = `loginAttempts_${identifier}`;
    localStorage.removeItem(key);
  }

  async logout(): Promise<void> {
    this.clearSecurityMonitoring();
    this.currentSession = null;
    this.lastActivityTime = Date.now();
    localStorage.removeItem('authSession');
    await apiService.logout();
  }

  getCurrentSession(): AuthSession | null {
    // Try to restore from localStorage
    if (!this.currentSession) {
      const stored = localStorage.getItem('authSession');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          parsed.expiresAt = new Date(parsed.expiresAt);
          if (parsed.lastActivity) {
            parsed.lastActivity = new Date(parsed.lastActivity);
          }
          this.currentSession = parsed;
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
    
    // Ensure expiresAt is a Date object
    const expiresAt = session.expiresAt instanceof Date 
      ? session.expiresAt 
      : new Date(session.expiresAt);
    
    // Check if session expired
    if (expiresAt <= new Date()) {
      this.logout();
      return false;
    }
    
    // For managers and directors, check inactivity
    const isHighSecurity = this.HIGH_SECURITY_ROLES.includes(session.role);
    if (isHighSecurity) {
      const lastActivity = session.lastActivity 
        ? (session.lastActivity instanceof Date ? session.lastActivity : new Date(session.lastActivity))
        : new Date(expiresAt.getTime() - this.SESSION_TIMEOUT);
      const timeSinceActivity = Date.now() - lastActivity.getTime();
      
      if (timeSinceActivity >= this.INACTIVITY_TIMEOUT) {
        this.logout();
        return false;
      }
    }
    
    return true;
  }

  hasRole(role: UserRole): boolean {
    return this.getCurrentSession()?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const session = this.getCurrentSession();
    return session ? roles.includes(session.role) : false;
  }

  async verifyToken(): Promise<{ success: boolean; user?: any }> {
    try {
      return await apiService.verifyToken();
    } catch (error) {
      console.error('Token verification failed:', error);
      return { success: false };
    }
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
