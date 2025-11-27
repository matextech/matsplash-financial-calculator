import { apiService } from './apiService';
import { User } from '../types/auth';

/**
 * Initialize default director account if no users exist
 * NOTE: This is now handled by the backend on first run, but kept for reference
 */
export async function initializeDefaultDirector(): Promise<void> {
  try {
    const users = await apiService.getUsers();
    // Handle both array and object with data property
    const usersList = Array.isArray(users) ? users : (users.data || []);
    
    // Check if any director exists
    const directorExists = usersList.some((u: User) => u.role === 'director');
    
    if (!directorExists) {
      // Create default director account
      // Default credentials: email: director@matsplash.com, password: admin123
      try {
        await apiService.createUser({
          name: 'Director',
          email: 'director@matsplash.com',
          phone: '08000000000', // Required field, using placeholder
          password: 'admin123', // In production, this should be hashed
          role: 'director',
          twoFactorEnabled: false,
          isActive: true,
        });
        
        console.log('Default director account created:');
        console.log('Email: director@matsplash.com');
        console.log('Password: admin123');
        console.log('Please change the password after first login!');
      } catch (addUserError) {
        console.error('Error adding default director user:', addUserError);
        // Don't throw - allow app to continue
      }
    }
  } catch (error) {
    console.error('Error initializing default director:', error);
  }
}

/**
 * Initialize default manager, receptionist, and storekeeper accounts if they don't exist
 * Also updates existing accounts to add emails if missing
 * NOTE: This is now handled by the backend on first run, but kept for reference
 */
export async function initializeDefaultAccounts(): Promise<void> {
  try {
    const users = await apiService.getUsers();
    // Handle both array and object with data property
    const usersList = Array.isArray(users) ? users : (users.data || []);
    
    // Manager
    const manager = usersList.find((u: User) => u.role === 'manager');
    if (!manager) {
      await apiService.createUser({
        name: 'Manager',
        email: 'manager@matsplash.com',
        phone: '08012345678',
        pin: '1234',
        role: 'manager',
        twoFactorEnabled: false,
        isActive: true,
      });
    } else if (!manager.email && manager.id) {
      // Update existing manager to add email
      await apiService.updateUser(manager.id, {
        email: 'manager@matsplash.com'
      });
      console.log('Updated manager account with email');
    }
    
    // Receptionist
    const receptionist = usersList.find((u: User) => u.role === 'receptionist');
    if (!receptionist) {
      await apiService.createUser({
        name: 'Receptionist',
        email: 'receptionist@matsplash.com',
        phone: '08012345679',
        pin: '1234',
        role: 'receptionist',
        twoFactorEnabled: false,
        isActive: true,
      });
    } else if (!receptionist.email && receptionist.id) {
      // Update existing receptionist to add email
      await apiService.updateUser(receptionist.id, {
        email: 'receptionist@matsplash.com'
      });
      console.log('Updated receptionist account with email');
    }
    
    // Storekeeper
    const storekeeper = usersList.find((u: User) => u.role === 'storekeeper');
    if (!storekeeper) {
      await apiService.createUser({
        name: 'Storekeeper',
        email: 'storekeeper@matsplash.com',
        phone: '08012345680',
        pin: '1234',
        role: 'storekeeper',
        twoFactorEnabled: false,
        isActive: true,
      });
    } else if (!storekeeper.email && storekeeper.id) {
      // Update existing storekeeper to add email
      await apiService.updateUser(storekeeper.id, {
        email: 'storekeeper@matsplash.com'
      });
      console.log('Updated storekeeper account with email');
    }
  } catch (error) {
    console.error('Error initializing default accounts:', error);
  }
}

