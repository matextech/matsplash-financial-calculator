import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database';

const router = express.Router();

// Helper function to transform database fields to frontend format
function transformUser(user: any) {
  return {
    ...user,
    isActive: user.is_active === 1 || user.is_active === true,
    twoFactorEnabled: user.two_factor_enabled === 1 || user.two_factor_enabled === true,
    pinResetRequired: user.pin_reset_required === 1 || user.pin_reset_required === true,
  };
}

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await db('users').select('*').orderBy('name');
    res.json({
      success: true,
      data: users.map(transformUser)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await db('users').where('id', req.params.id).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      data: transformUser(user)
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { phone, email, password, pin, role, name, twoFactorEnabled, isActive } = req.body;

    if (!phone || !role || !name) {
      return res.status(400).json({
        success: false,
        message: 'Phone, role, and name are required'
      });
    }

    // Check if user already exists
    const existing = await db('users')
      .where('phone', phone)
      .orWhere(function() {
        if (email) {
          this.where('email', email);
        }
      })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone or email already exists'
      });
    }

    let pinHash = null;
    if (pin) {
      pinHash = await bcrypt.hash(pin, 10);
    }

    const [id] = await db('users').insert({
      phone,
      email: email || null,
      password: role === 'director' ? password : null,
      pin_hash: role !== 'director' ? pinHash : null,
      role,
      name,
      two_factor_enabled: twoFactorEnabled ? 1 : 0, // SQLite uses 0/1
      is_active: isActive !== undefined ? (isActive ? 1 : 0) : 1 // SQLite uses 0/1
    });

    res.json({
      success: true,
      data: { id },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists and get current role
    const currentUser = await db('users').where('id', id).first();
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating director
    if (req.body.isActive !== undefined && currentUser.role === 'director') {
      const isActiveValue = req.body.isActive === true || req.body.isActive === 'true' || req.body.isActive === 1 || req.body.isActive === '1';
      if (!isActiveValue) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate Director account. This would lock everyone out of the system.'
        });
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    
    // Handle password update for director
    if (req.body.password !== undefined) {
      if (currentUser.role === 'director') {
        if (req.body.password && req.body.password.trim() !== '') {
          // Only update if password is provided and not empty
          updateData.password = req.body.password.trim();
          console.log('✅ Updating password for director:', id, 'Password length:', updateData.password.length);
        } else {
          console.log('⚠️ Password field was empty for director, not updating.');
        }
      } else {
        // Non-directors don't use passwords, ignore this field
        console.log('⚠️ Password update attempted for non-director user, ignoring.');
      }
    }
    if (req.body.role !== undefined) {
      // Prevent changing director role
      if (currentUser.role === 'director' && req.body.role !== 'director') {
        return res.status(400).json({
          success: false,
          message: 'Cannot change Director role'
        });
      }
      updateData.role = req.body.role;
    }
    if (req.body.twoFactorEnabled !== undefined) updateData.two_factor_enabled = req.body.twoFactorEnabled ? 1 : 0;
    if (req.body.isActive !== undefined) {
      // Ensure we convert boolean/string to proper integer
      const isActiveValue = req.body.isActive === true || req.body.isActive === 'true' || req.body.isActive === 1 || req.body.isActive === '1';
      updateData.is_active = isActiveValue ? 1 : 0;
      console.log('Updating is_active for user:', id, 'name:', currentUser.name, 'from request:', req.body.isActive, 'to DB value:', updateData.is_active);
    }

    // Handle PIN update
    if (req.body.pin !== undefined) {
      updateData.pin_hash = await bcrypt.hash(req.body.pin, 10);
      console.log('Updating PIN for user:', id);
    }
    
    // Safety check: If reactivating a non-director user without a PIN, set default PIN (DEVELOPMENT ONLY)
    // In production, PIN must be explicitly set by administrator
    if (req.body.isActive === true && currentUser.role !== 'director' && process.env.NODE_ENV !== 'production') {
      const existingUser = await db('users').where('id', id).first();
      if (existingUser && !existingUser.pin_hash && existingUser.role !== 'director') {
        console.log('⚠️ Reactivating user without PIN hash. Setting default PIN (1234) - DEVELOPMENT ONLY for user:', id);
        updateData.pin_hash = await bcrypt.hash('1234', 10);
      }
    }

    // Handle PIN reset required flag (SQLite uses 0/1)
    if (req.body.pinResetRequired !== undefined) {
      updateData.pin_reset_required = req.body.pinResetRequired ? 1 : 0;
      console.log('Setting pin_reset_required to:', updateData.pin_reset_required);
    }

    const updateResult = await db('users').where('id', id).update(updateData);
    console.log('User update completed for user:', id, 'Update data:', { ...updateData, password: updateData.password ? '***HIDDEN***' : undefined }, 'Rows affected:', updateResult);

    // Return updated user - force a fresh read
    const updatedUser = await db('users').where('id', id).first();
    console.log('Updated user from DB:', { 
      id: updatedUser.id, 
      is_active: updatedUser.is_active, 
      is_active_type: typeof updatedUser.is_active,
      name: updatedUser.name,
      role: updatedUser.role 
    });
    
    // Verify the update actually took
    if (req.body.isActive !== undefined && updatedUser.is_active !== updateData.is_active) {
      console.error('WARNING: is_active update may have failed! Expected:', updateData.is_active, 'Got:', updatedUser.is_active);
    }

    res.json({
      success: true,
      data: transformUser(updatedUser),
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset PIN endpoint
router.post('/:id/reset-pin', async (req, res) => {
  try {
    const { id } = req.params;
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    const pinHash = await bcrypt.hash(newPin, 10);

    await db('users')
      .where('id', id)
      .update({
        pin_hash: pinHash,
        pin_reset_required: 1, // Mark as requiring reset
        updated_at: new Date().toISOString()
      });

    console.log('PIN reset for user:', id, 'New PIN:', newPin);

    res.json({
      success: true,
      data: { newPin },
      message: `PIN reset successfully. New temporary PIN: ${newPin}`
    });
  } catch (error) {
    console.error('Error resetting PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await db('users').where('id', id).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting director
    if (user.role === 'director') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Director account. This would lock everyone out of the system.'
      });
    }

    // Delete user
    await db('users').where('id', id).delete();
    
    console.log('✅ User deleted:', { id, name: user.name, role: user.role });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Clean receptionist and storekeeper data
router.post('/clean-data', async (req, res) => {
  try {
    const { dataType } = req.body; // 'receptionist', 'storekeeper', or 'all'

    if (!dataType || !['receptionist', 'storekeeper', 'all'].includes(dataType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data type. Must be "receptionist", "storekeeper", or "all"'
      });
    }

    let deletedCount = 0;

    if (dataType === 'receptionist' || dataType === 'all') {
      // Delete all receptionist sales
      const receptionistCount = await db('receptionist_sales').count('* as count').first();
      await db('receptionist_sales').delete();
      deletedCount += parseInt(receptionistCount?.count || '0');
      console.log('✅ Cleaned receptionist sales:', receptionistCount?.count || 0);
    }

    if (dataType === 'storekeeper' || dataType === 'all') {
      // Delete all storekeeper entries
      const storekeeperCount = await db('storekeeper_entries').count('* as count').first();
      await db('storekeeper_entries').delete();
      deletedCount += parseInt(storekeeperCount?.count || '0');
      console.log('✅ Cleaned storekeeper entries:', storekeeperCount?.count || 0);
    }

    if (dataType === 'all') {
      // Also clean settlements related to receptionist sales
      await db('settlements').delete();
      await db('settlement_payments').delete();
      console.log('✅ Cleaned settlements and settlement payments');
    }

    res.json({
      success: true,
      message: `Data cleaned successfully. Deleted ${deletedCount} records.`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

