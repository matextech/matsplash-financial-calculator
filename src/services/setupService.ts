import { dbService } from './database';
import { User } from '../types/auth';

/**
 * Initialize default director account if no users exist
 */
export async function initializeDefaultDirector(): Promise<void> {
  try {
    const users = await dbService.getUsers();
    
    // Check if any director exists
    const directorExists = users.some(u => u.role === 'director');
    
    if (!directorExists) {
      // Create default director account
      // Default credentials: email: director@matsplash.com, password: admin123
      await dbService.addUser({
        name: 'Director',
        email: 'director@matsplash.com',
        phone: '',
        password: 'admin123', // In production, this should be hashed
        role: 'director',
        twoFactorEnabled: false,
        isActive: true,
      });
      
      console.log('Default director account created:');
      console.log('Email: director@matsplash.com');
      console.log('Password: admin123');
      console.log('Please change the password after first login!');
    }
  } catch (error) {
    console.error('Error initializing default director:', error);
  }
}

/**
 * Initialize default manager, receptionist, and storekeeper accounts if they don't exist
 */
export async function initializeDefaultAccounts(): Promise<void> {
  try {
    const users = await dbService.getUsers();
    
    // Manager
    const managerExists = users.some(u => u.role === 'manager');
    if (!managerExists) {
      await dbService.addUser({
        name: 'Manager',
        phone: '08012345678',
        pin: '1234',
        role: 'manager',
        twoFactorEnabled: false,
        isActive: true,
      });
    }
    
    // Receptionist
    const receptionistExists = users.some(u => u.role === 'receptionist');
    if (!receptionistExists) {
      await dbService.addUser({
        name: 'Receptionist',
        phone: '08012345679',
        pin: '1234',
        role: 'receptionist',
        twoFactorEnabled: false,
        isActive: true,
      });
    }
    
    // Storekeeper
    const storekeeperExists = users.some(u => u.role === 'storekeeper');
    if (!storekeeperExists) {
      await dbService.addUser({
        name: 'Storekeeper',
        phone: '08012345680',
        pin: '1234',
        role: 'storekeeper',
        twoFactorEnabled: false,
        isActive: true,
      });
    }
  } catch (error) {
    console.error('Error initializing default accounts:', error);
  }
}

