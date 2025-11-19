import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const session = authService.getCurrentSession();

  if (!session || !authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

