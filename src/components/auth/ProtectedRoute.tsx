import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const HIGH_SECURITY_ROLES: UserRole[] = ['manager', 'director'];

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const session = authService.getCurrentSession();

      if (!session || !authService.isAuthenticated()) {
        setIsAuthorized(false);
        setIsValidating(false);
        return;
      }

      // Check role permissions
      if (allowedRoles && !allowedRoles.includes(session.role)) {
        setIsAuthorized(false);
        setIsValidating(false);
        return;
      }

      // For managers and directors, perform additional security checks
      const isHighSecurity = HIGH_SECURITY_ROLES.includes(session.role);
      if (isHighSecurity) {
        try {
          // Verify token with backend
          const verification = await authService.verifyToken();
          if (!verification || !verification.success) {
            console.warn('Token verification failed for high-security role');
            authService.logout();
            setIsAuthorized(false);
            setIsValidating(false);
            return;
          }

          // Check session expiration (ensure expiresAt is a Date object)
          const expiresAt = session.expiresAt instanceof Date 
            ? session.expiresAt 
            : new Date(session.expiresAt);
          if (expiresAt <= new Date()) {
            console.warn('Session expired');
            authService.logout();
            setIsAuthorized(false);
            setIsValidating(false);
            return;
          }
        } catch (error) {
          console.error('Session validation error:', error);
          authService.logout();
          setIsAuthorized(false);
          setIsValidating(false);
          return;
        }
      }

      setIsAuthorized(true);
      setIsValidating(false);
    };

    validateSession();

    // For high-security roles, re-validate periodically
    const session = authService.getCurrentSession();
    const isHighSecurity = session && HIGH_SECURITY_ROLES.includes(session.role);
    
    if (isHighSecurity) {
      const interval = setInterval(validateSession, 5 * 60 * 1000); // Every 5 minutes
      return () => clearInterval(interval);
    }
  }, [allowedRoles]);

  if (isValidating) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Validating session...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    const secretPath = import.meta.env?.VITE_LOGIN_SECRET_PATH || 'matsplash-fin-2jg1wCHqcMOEhlBr';
    return <Navigate to={`/login/${secretPath}`} replace />;
  }

  return <>{children}</>;
}

