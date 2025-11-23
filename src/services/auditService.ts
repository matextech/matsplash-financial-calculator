import { apiService } from './apiService';
import { authService } from './authService';
import { AuditLog } from '../types/sales-log';

export class AuditService {
  /**
   * Log an audit entry when data is updated
   */
  static async logUpdate(
    entityType: 'receptionist_sale' | 'storekeeper_entry' | 'settlement' | 'user',
    entityId: number,
    field: string,
    oldValue: string | number,
    newValue: string | number,
    reason: string
  ): Promise<void> {
    try {
      const session = authService.getCurrentSession();
      if (!session) {
        console.warn('No session found for audit log');
        return;
      }

      await apiService.createAuditLog({
        entityType,
        entityId,
        action: 'update',
        field,
        oldValue: oldValue?.toString(),
        newValue: newValue?.toString(),
        changedBy: session.userId,
        changedAt: new Date(),
        reason,
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Log when data is created
   */
  static async logCreate(
    entityType: 'receptionist_sale' | 'storekeeper_entry' | 'settlement' | 'user',
    entityId: number
  ): Promise<void> {
    try {
      const session = authService.getCurrentSession();
      if (!session) {
        console.warn('No session found for audit log');
        return;
      }

      await apiService.createAuditLog({
        entityType,
        entityId,
        action: 'create',
        changedBy: session.userId,
        changedAt: new Date(),
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Log when data is deleted
   */
  static async logDelete(
    entityType: 'receptionist_sale' | 'storekeeper_entry' | 'settlement' | 'user',
    entityId: number,
    reason?: string
  ): Promise<void> {
    try {
      const session = authService.getCurrentSession();
      if (!session) {
        console.warn('No session found for audit log');
        return;
      }

      await apiService.createAuditLog({
        entityType,
        entityId,
        action: 'delete',
        changedBy: session.userId,
        changedAt: new Date(),
        reason,
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Log when data is submitted
   */
  static async logSubmit(
    entityType: 'receptionist_sale' | 'storekeeper_entry',
    entityId: number
  ): Promise<void> {
    try {
      const session = authService.getCurrentSession();
      if (!session) {
        console.warn('No session found for audit log');
        return;
      }

      await apiService.createAuditLog({
        entityType,
        entityId,
        action: 'submit',
        changedBy: session.userId,
        changedAt: new Date(),
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }
}

