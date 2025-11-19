export type UserRole = 'director' | 'manager' | 'receptionist' | 'storekeeper';

export interface User {
  id?: number;
  phone: string; // For manager, receptionist, storekeeper
  email?: string; // For director
  password?: string; // Hashed password
  pin?: string; // 4-6 digit PIN for phone-based login
  role: UserRole;
  name: string;
  twoFactorSecret?: string; // For 2FA (Director only)
  twoFactorEnabled: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

export interface AuthSession {
  userId: number;
  role: UserRole;
  token: string;
  expiresAt: Date;
}

