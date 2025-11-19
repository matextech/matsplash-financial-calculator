# Multi-User System Documentation

## Overview

The Matsplash Financial Calculator now includes a comprehensive multi-user system with role-based access control. The system supports four distinct user roles: Director, Manager, Receptionist, and Storekeeper.

## User Roles

### 1. Director
- **Login**: Email + Password (with optional 2FA)
- **Access**: Full system access
- **Features**:
  - View all data from all roles (Manager, Receptionist, Storekeeper views)
  - Manage user accounts (create, edit, reset PINs, enable/disable accounts)
  - Add/edit drivers and packers
  - View comprehensive audit logs (many years of history)
  - Access to original financial dashboard (expenses, materials, salaries, etc.)
  - Configure system settings (material costs, sales prices)

### 2. Manager
- **Login**: Phone number + PIN
- **Access**: View and manage receptionist and storekeeper data
- **Features**:
  - View receptionist sales entries (month view)
  - Enter settlement amounts for sales
  - Mark settlements as complete
  - View storekeeper entries (driver pickups, packer production)
  - Update receptionist/storekeeper entries (with audit logging)
  - Receive notifications for new entries
  - View monthly reports

### 3. Receptionist
- **Login**: Phone number + PIN
- **Access**: Submit sales data only
- **Features**:
  - Record sales by driver, general sales, or mini store dispatch
  - Enter bags sold at different price points (configured by director)
  - View last 2 days of sales only
  - Submit entries (once submitted, cannot be modified)
  - Receive notifications when settlements are completed
  - No financial calculations visible

### 4. Storekeeper
- **Login**: Phone number + PIN
- **Access**: Submit inventory/packing data
- **Features**:
  - Record driver pickups (bags picked up by drivers)
  - Record general sales pickups
  - Record packer production (water packed by packers)
  - View last 2 days of entries only
  - Submit entries (once submitted, cannot be modified)
  - Works independently from receptionist

## Default Accounts

On first run, the system creates a default director account:
- **Email**: director@matsplash.com
- **Password**: admin123
- **⚠️ IMPORTANT**: Change the password immediately after first login!

Default accounts for other roles can be created by the director through the User Management interface.

## Authentication

### Director Login
1. Enter email address
2. Enter password
3. If 2FA is enabled, enter 6-digit code from authenticator app

### Other Roles Login
1. Enter phone number
2. Enter 4-digit PIN

## Key Features

### Receptionist Dashboard
- **Sales Entry**: Record bags sold at different price points
- **Sale Types**:
  - Driver Sale: Linked to specific driver
  - General Sales: Factory/walk-in customers
  - Mini Store Dispatch: Mini store sales
- **Confirmation**: System warns before submission; once submitted, entry cannot be modified
- **View Limit**: Only last 2 days visible

### Storekeeper Dashboard
- **Entry Types**:
  - Driver Pickup: Bags picked up by drivers
  - General Sales: General pickup
  - Packer Production: Water packed by packers
- **One-time Submission**: End-of-day submission, cannot be modified after
- **View Limit**: Only last 2 days visible

### Manager Dashboard
- **Settlement Management**:
  - View all receptionist sales
  - Enter settled amounts
  - Track remaining balances
  - Mark as settled when balance is zero
- **Update Capability**: Can update receptionist/storekeeper entries with reason (audit logged)
- **Monthly View**: View and manage data for entire month
- **Notifications**: See when new entries are submitted

### Director Dashboard
- **Overview Tab**: View all role data with subtabs:
  - Manager View: Sales and settlements overview
  - Receptionist View: All sales entries
  - Storekeeper View: All inventory entries
- **User Management**: 
  - Create/edit user accounts
  - Reset PINs
  - Enable/disable accounts
  - Configure 2FA for director accounts
- **Employee Management**: Add/edit drivers and packers
- **Audit Logs**: Comprehensive audit trail of all changes
- **Long-term Records**: View data for many years (vs. manager's 1 month view)

## Audit Logging

All updates to receptionist sales and storekeeper entries are logged with:
- Who made the change
- What field was changed
- Old value
- New value
- Reason for change
- Timestamp

Audit logs are visible to the Director in the Audit Logs tab.

## Notifications

- Receptionist receives notification when their sales are settled
- Manager receives notifications for new entries
- Notifications appear in the dashboard header

## Data Flow

1. **Receptionist** records sales → Data submitted (locked)
2. **Storekeeper** records pickups/production → Data submitted (locked)
3. **Manager** views both, enters settlements, can update entries (with audit log)
4. **Director** views everything, manages accounts and employees

## Security Notes

- Passwords are stored in plain text (for demo purposes). In production, use bcrypt or similar.
- 2FA implementation is basic (accepts any 6-digit code). In production, use proper TOTP library.
- Session tokens are simple random strings. In production, use JWT or similar.
- PINs are 4 digits. Consider increasing complexity for production.

## Database Schema

New object stores added:
- `users`: User accounts
- `receptionistSales`: Sales entries from receptionist
- `storekeeperEntries`: Inventory/packing entries
- `settlements`: Settlement records
- `auditLogs`: Audit trail
- `notifications`: User notifications

## Routes

- `/login` - Login page
- `/director` - Director dashboard
- `/manager` - Manager dashboard
- `/receptionist` - Receptionist dashboard
- `/storekeeper` - Storekeeper dashboard
- Original routes (`/dashboard`, `/employees`, etc.) - Director only

## Next Steps

1. **Production Hardening**:
   - Implement proper password hashing (bcrypt)
   - Implement proper 2FA (speakeasy or similar)
   - Use JWT for session management
   - Add rate limiting
   - Add input validation and sanitization

2. **Features to Consider**:
   - Email/SMS notifications
   - Export reports to PDF/Excel
   - Mobile app versions
   - Offline sync capability
   - Backup/restore functionality

