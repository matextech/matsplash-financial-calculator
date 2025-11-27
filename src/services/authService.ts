import { UserRole, AuthSession } from '../types/auth';
import { apiService } from './apiService';

class AuthService {
  private currentSession: AuthSession | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime: number = Date.now();

  // Security settings for managers and directors
  private readonly HIGH_SECURITY_ROLES: UserRole[] = ['manager', 'director'];
  private readonly INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes maximum inactivity (if no activity)
  private readonly SESSION_CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds for better responsiveness
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours maximum session timeout (extended since we track activity)

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
      
      // Create session with extended timeout (activity-based logout handles security)
      const sessionTimeout = this.SESSION_TIMEOUT; // 24 hours, but activity monitoring will logout after 2 min inactivity
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
      
      // Set up security monitoring for ALL users (activity-based logout)
      this.setupSecurityMonitoring();
      
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
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'input', 'change', 'focus', 'keydown'];
    const resetActivity = () => {
      const now = Date.now();
      this.lastActivityTime = now;
      if (this.currentSession) {
        this.currentSession.lastActivity = new Date(now);
        localStorage.setItem('authSession', JSON.stringify(this.currentSession));
      }
    };

    // Use passive listeners for better performance
    events.forEach(event => {
      document.addEventListener(event, resetActivity, { passive: true, capture: true });
    });

    // Also track API calls as activity
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      resetActivity();
      return originalFetch(...args);
    };

    // Check for inactivity more frequently - but only logout if truly inactive
    this.inactivityTimer = setInterval(() => {
      if (!this.currentSession) return;
      
      // Get the most recent activity time from both memory and localStorage
      const storedSession = localStorage.getItem('authSession');
      let storedLastActivity = this.lastActivityTime;
      
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          if (parsed.lastActivity) {
            const storedTime = parsed.lastActivity instanceof Date 
              ? parsed.lastActivity.getTime() 
              : new Date(parsed.lastActivity).getTime();
            // Use the most recent activity time
            storedLastActivity = Math.max(storedLastActivity, storedTime);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      const timeSinceActivity = Date.now() - storedLastActivity;
      
      // Only logout if we've been inactive for the full timeout period
      if (timeSinceActivity >= this.INACTIVITY_TIMEOUT) {
        console.warn('Inactivity timeout - logging out after', Math.round(timeSinceActivity / 1000), 'seconds of inactivity');
        this.logout();
        window.location.href = '/login?reason=inactivity';
      }
    }, this.SESSION_CHECK_INTERVAL); // Check every 30 seconds
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
    
    // For all users, check inactivity - but use the most recent activity time
    const lastActivity = session.lastActivity 
      ? (session.lastActivity instanceof Date ? session.lastActivity : new Date(session.lastActivity))
      : new Date(expiresAt.getTime() - this.SESSION_TIMEOUT);
    
    // Use the most recent activity time from memory or session
    const mostRecentActivity = Math.max(
      lastActivity.getTime(),
      this.lastActivityTime
    );
    
    const timeSinceActivity = Date.now() - mostRecentActivity;
    
    // Only logout if we've been inactive for the full timeout period
    if (timeSinceActivity >= this.INACTIVITY_TIMEOUT) {
      this.logout();
      return false;
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
