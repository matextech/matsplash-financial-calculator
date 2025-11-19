import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database';
import { config } from '../config';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { identifier, passwordOrPin } = req.body;

    if (!identifier || !passwordOrPin) {
      return res.status(400).json({
        success: false,
        message: 'Email/Phone and Password/PIN are required'
      });
    }

    console.log('Login attempt:', { identifier });

    // Find user by email or phone
    const user = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .andWhere('is_active', 1) // SQLite stores boolean as 0/1
      .first();

    if (!user) {
      console.log('User not found:', identifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User found:', { id: user.id, name: user.name, role: user.role });

    // Verify password/PIN
    let isValid = false;
    if (user.role === 'director') {
      // Director uses password
      isValid = user.password === passwordOrPin; // In production, use bcrypt.compare
    } else {
      // Other roles use PIN
      if (!user.pin_hash) {
        return res.status(401).json({
          success: false,
          message: 'PIN not set. Please contact administrator.'
        });
      }
      isValid = await bcrypt.compare(passwordOrPin, user.pin_hash);
    }

    if (!isValid) {
      console.log('Invalid credentials for user:', user.id);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if PIN reset is required (SQLite stores as 0/1)
    const pinResetRequired = user.role !== 'director' && (user.pin_reset_required === 1 || user.pin_reset_required === true);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    // Update last login
    await db('users')
      .where('id', user.id)
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    console.log('Login successful for:', user.name, 'PIN reset required:', pinResetRequired);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active
      },
      token,
      pinResetRequired,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change PIN endpoint (for temporary PIN reset)
router.post('/change-pin', async (req, res) => {
  try {
    const { userId, newPin } = req.body;

    if (!userId || !newPin) {
      return res.status(400).json({
        success: false,
        message: 'User ID and new PIN are required'
      });
    }

    if (newPin.length < 4 || newPin.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be 4-6 digits'
      });
    }

    // Hash the new PIN
    const saltRounds = 10;
    const pinHash = await bcrypt.hash(newPin, saltRounds);

    // Update user's PIN and clear reset flag
    await db('users')
      .where('id', userId)
      .update({
        pin_hash: pinHash,
        pin_reset_required: 0, // SQLite uses 0/1
        updated_at: new Date().toISOString()
      });

    console.log('PIN changed successfully for user:', userId);

    res.json({
      success: true,
      message: 'PIN changed successfully'
    });

  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;

    // Get user from database
    const user = await db('users')
      .where('id', decoded.userId)
      .andWhere('is_active', 1) // SQLite stores boolean as 0/1
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  // For JWT, logout is handled client-side by removing the token
  // In production, you might want to blacklist tokens
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;

