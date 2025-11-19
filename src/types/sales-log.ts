// Receptionist Sales Entry
export interface ReceptionistSale {
  id?: number;
  date: Date;
  driverId?: number; // null for general sales or mini store dispatch
  driverName?: string;
  saleType: 'driver' | 'general' | 'mini_store';
  bagsAtPrice1: number; // Bags at first price (e.g., ₦250)
  bagsAtPrice2: number; // Bags at second price (e.g., ₦270)
  totalBags: number;
  submittedBy: number; // Receptionist user ID
  submittedAt: Date;
  isSubmitted: boolean; // Once submitted, cannot be modified
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Storekeeper Entry
export interface StorekeeperEntry {
  id?: number;
  date: Date;
  entryType: 'driver_pickup' | 'general_sales' | 'packer_production' | 'ministore_pickup';
  driverId?: number; // For driver pickup
  driverName?: string;
  packerId?: number; // For packer production
  packerName?: string;
  bagsCount: number;
  submittedBy: number; // Storekeeper user ID
  submittedAt: Date;
  isSubmitted: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Settlement Entry (Manager)
export interface Settlement {
  id?: number;
  date: Date;
  receptionistSaleId: number; // Link to receptionist sale
  expectedAmount: number; // Calculated from bags sold
  settledAmount: number; // Amount actually received
  remainingBalance: number; // expectedAmount - settledAmount
  isSettled: boolean; // true when remainingBalance is 0
  settledBy: number; // Manager user ID
  settledAt?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Audit Log
export interface AuditLog {
  id?: number;
  entityType: 'receptionist_sale' | 'storekeeper_entry' | 'settlement' | 'user';
  entityId: number;
  action: 'create' | 'update' | 'delete' | 'submit' | 'settle';
  field?: string; // Field that was changed
  oldValue?: string | number;
  newValue?: string | number;
  changedBy: number; // User ID who made the change
  changedAt: Date;
  reason?: string; // Reason for the change
  ipAddress?: string;
  userAgent?: string;
}

// Notification
export interface Notification {
  id?: number;
  userId: number;
  type: 'settlement_complete' | 'entry_updated' | 'account_modified';
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityType?: 'receptionist_sale' | 'settlement';
  relatedEntityId?: number;
  createdAt: Date;
}

