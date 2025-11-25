import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TOTP } from 'otpauth';
import { db } from '../database';
import { config } from '../config';

const router = express.Router();

// Log all registered routes for debugging
console.log('🔐 Auth routes module loaded');

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

    // Check if 2FA is enabled and if code is provided
    const twoFactorEnabled = user.two_factor_enabled === 1 || user.two_factor_enabled === true;
    const { twoFactorCode } = req.body;

    if (twoFactorEnabled && !twoFactorCode) {
      // 2FA is enabled but no code provided
      return res.status(200).json({
        success: false,
        requires2FA: true,
        message: '2FA code required'
      });
    }

    // If 2FA is enabled, verify the code
    if (twoFactorEnabled && twoFactorCode) {
      if (!user.two_factor_secret) {
        return res.status(500).json({
          success: false,
          message: '2FA is enabled but secret is missing. Please contact administrator.'
        });
      }

      try {
        const totp = new TOTP({
          secret: user.two_factor_secret,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        });

        const delta = totp.validate({ token: twoFactorCode, window: 1 });
        if (delta === null) {
          return res.status(401).json({
            success: false,
            message: 'Invalid 2FA code'
          });
        }
      } catch (error) {
        console.error('2FA verification error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error verifying 2FA code'
        });
      }
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
        isActive: user.is_active,
        twoFactorEnabled: twoFactorEnabled
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

// Enable 2FA endpoint
console.log('🔐 Registering /enable-2fa route');
router.post('/enable-2fa', async (req, res) => {
  console.log('🔐 Enable 2FA endpoint called');
  try {
    const { userId, secret } = req.body;

    if (!userId || !secret) {
      return res.status(400).json({
        success: false,
        message: 'User ID and secret are required'
      });
    }

    // Verify the user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user with 2FA secret and enable 2FA
    await db('users')
      .where('id', userId)
      .update({
        two_factor_secret: secret,
        two_factor_enabled: 1, // SQLite uses 0/1
        updated_at: new Date().toISOString()
      });

    console.log('2FA enabled for user:', userId);

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Disable 2FA endpoint
router.post('/disable-2fa', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Verify the user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Disable 2FA and clear secret
    await db('users')
      .where('id', userId)
      .update({
        two_factor_secret: null,
        two_factor_enabled: 0, // SQLite uses 0/1
        updated_at: new Date().toISOString()
      });

    console.log('2FA disabled for user:', userId);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify 2FA code endpoint (for login with 2FA)
router.post('/verify-2fa', async (req, res) => {
  try {
    const { identifier, passwordOrPin, code } = req.body;

    if (!identifier || !passwordOrPin || !code) {
      return res.status(400).json({
        success: false,
        message: 'Identifier, password/PIN, and 2FA code are required'
      });
    }

    // Find user by email or phone
    const user = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .andWhere('is_active', 1)
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password/PIN
    let isValid = false;
    if (user.role === 'director') {
      isValid = user.password === passwordOrPin;
    } else {
      if (!user.pin_hash) {
        return res.status(401).json({
          success: false,
          message: 'PIN not set. Please contact administrator.'
        });
      }
      isValid = await bcrypt.compare(passwordOrPin, user.pin_hash);
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify 2FA code
    if (!user.two_factor_secret) {
      return res.status(500).json({
        success: false,
        message: '2FA is enabled but secret is missing'
      });
    }

    try {
      const totp = new TOTP({
        secret: user.two_factor_secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
        });
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying 2FA code'
      });
    }

    // Check if PIN reset is required
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
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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

