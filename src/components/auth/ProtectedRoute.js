import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
const HIGH_SECURITY_ROLES = ['manager', 'director'];
export default function ProtectedRoute({ children, allowedRoles }) {
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
                }
                catch (error) {
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
        return (_jsx("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }, children: _jsx("div", { children: "Validating session..." }) }));
    }
    if (!isAuthorized) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
