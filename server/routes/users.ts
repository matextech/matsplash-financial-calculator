import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await db('users').select('*').orderBy('name');
    res.json({
      success: true,
      data: users
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
      data: user
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
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.password !== undefined) updateData.password = req.body.password;
    if (req.body.role !== undefined) updateData.role = req.body.role;
    if (req.body.twoFactorEnabled !== undefined) updateData.two_factor_enabled = req.body.twoFactorEnabled ? 1 : 0;
    if (req.body.isActive !== undefined) updateData.is_active = req.body.isActive ? 1 : 0;

    // Handle PIN update
    if (req.body.pin !== undefined) {
      updateData.pin_hash = await bcrypt.hash(req.body.pin, 10);
      console.log('Updating PIN for user:', id);
    }

    // Handle PIN reset required flag (SQLite uses 0/1)
    if (req.body.pinResetRequired !== undefined) {
      updateData.pin_reset_required = req.body.pinResetRequired ? 1 : 0;
      console.log('Setting pin_reset_required to:', updateData.pin_reset_required);
    }

    await db('users').where('id', id).update(updateData);

    // Return updated user
    const updatedUser = await db('users').where('id', id).first();

    res.json({
      success: true,
      data: updatedUser,
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
    await db('users').where('id', req.params.id).delete();
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

export default router;

