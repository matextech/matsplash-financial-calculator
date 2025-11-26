import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TOTP } from 'otpauth';
import crypto from 'crypto';
import { db } from '../database';
import { config } from '../config';

const router = express.Router();

// Log all registered routes for debugging
console.log('🔐 Auth routes module loaded');
console.log('📋 PIN Recovery routes: /request-pin-recovery, /verify-pin-recovery');

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

    console.log('🔐 Login attempt:', { identifier, timestamp: new Date().toISOString() });

    // Find user by email or phone (check active status separately for better error messages)
    const user = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .first();

    if (!user) {
      console.log('❌ User not found:', identifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('👤 User found:', { 
      id: user.id, 
      name: user.name, 
      role: user.role,
      email: user.email,
      phone: user.phone,
      is_active: user.is_active,
      is_active_type: typeof user.is_active
    });

    // Check if user is active - handle different data types from SQLite
    const isActive = user.is_active === 1 || user.is_active === true || user.is_active === '1';
    console.log('✅ Checking user active status:', { 
      id: user.id, 
      name: user.name, 
      is_active: user.is_active, 
      is_active_type: typeof user.is_active,
      isActive_result: isActive 
    });
    
    if (!isActive) {
      console.log('🚫 User is inactive - blocking login:', { 
        id: user.id, 
        name: user.name, 
        is_active: user.is_active, 
        is_active_type: typeof user.is_active 
      });
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact administrator.'
      });
    }

    console.log('✅ User is active, proceeding with credential verification');

    // Verify password/PIN
    let isValid = false;
    if (user.role === 'director') {
      // Director uses password
      console.log('🔑 Verifying director password (plain text comparison)');
      isValid = user.password === passwordOrPin; // In production, use bcrypt.compare
      console.log('🔑 Password match result:', isValid);
    } else {
      // Other roles use PIN
      console.log('🔑 Verifying PIN for role:', user.role);
      console.log('🔑 PIN hash exists:', !!user.pin_hash);
      console.log('🔑 PIN hash length:', user.pin_hash ? user.pin_hash.length : 0);
      
      // Safety check: If PIN hash is missing, automatically set it to default '1234' (DEVELOPMENT ONLY)
      // In production, users must contact administrator to set their PIN
      if (!user.pin_hash && process.env.NODE_ENV !== 'production') {
        console.log('⚠️ PIN hash is missing for user. Auto-setting to default PIN (1234) - DEVELOPMENT ONLY:', { id: user.id, name: user.name, role: user.role });
        const defaultPinHash = await bcrypt.hash('1234', 10);
        await db('users').where('id', user.id).update({ pin_hash: defaultPinHash });
        user.pin_hash = defaultPinHash; // Update local user object
        console.log('✅ Default PIN hash set for user:', user.id);
      } else if (!user.pin_hash) {
        // Production: PIN must be set by administrator
        console.log('❌ PIN hash is missing for user in PRODUCTION:', { id: user.id, name: user.name, role: user.role });
        return res.status(401).json({
          success: false,
          message: 'PIN not set. Please contact administrator.'
        });
      }
      
      console.log('🔑 Testing provided PIN:', passwordOrPin);
      isValid = await bcrypt.compare(passwordOrPin, user.pin_hash);
      console.log('🔑 PIN verification result:', isValid);
      
      // If verification failed, also test with default PIN '1234' for debugging
      if (!isValid) {
        const testDefaultPin = await bcrypt.compare('1234', user.pin_hash);
        console.log('🔑 Testing default PIN (1234) for comparison:', testDefaultPin);
      }
    }

    if (!isValid) {
      console.log('❌ Invalid credentials for user:', { 
        id: user.id, 
        name: user.name, 
        role: user.role,
        hasPassword: !!user.password,
        hasPinHash: !!user.pin_hash,
        pinHashLength: user.pin_hash ? user.pin_hash.length : 0
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ Credentials valid for user:', { id: user.id, name: user.name, role: user.role });

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

    // Find user by email or phone (check active status separately for better error messages)
    const user = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active - handle different data types from SQLite
    const isActive = user.is_active === 1 || user.is_active === true || user.is_active === '1';
    console.log('Checking user active status in verify-2fa:', { 
      id: user.id, 
      name: user.name, 
      is_active: user.is_active, 
      is_active_type: typeof user.is_active,
      isActive_result: isActive 
    });
    
    if (!isActive) {
      console.log('User is inactive in verify-2fa:', { id: user.id, name: user.name, is_active: user.is_active, is_active_type: typeof user.is_active });
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact administrator.'
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

// Check if identifier belongs to a director (for showing PIN recovery option)
router.post('/check-director', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Identifier is required'
      });
    }

    // Find user by email or phone
    const user = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .first();

    // Security: Don't reveal if user exists, only if they're a director
    if (!user || user.role !== 'director') {
      return res.json({
        success: true,
        isDirector: false
      });
    }

    // Only return true if user exists AND is a director
    return res.json({
      success: true,
      isDirector: true
    });

  } catch (error) {
    console.error('Check director error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PIN Recovery - Request recovery token (Director only - can reset PINs for any user)
router.post('/request-pin-recovery', async (req, res) => {
  try {
    const { identifier, password, targetUserIdentifier } = req.body; 
    // identifier: Director's email/phone (for verification)
    // password: Director's password (required for security)
    // targetUserIdentifier: Email/phone of user whose PIN needs to be reset (optional, defaults to director's identifier)
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required for PIN recovery'
      });
    }

    console.log('🔐 PIN recovery requested:', { identifier, targetUserIdentifier, ipAddress, timestamp: new Date().toISOString() });

    // Find director by email or phone (must be director)
    const director = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .first();

    if (!director) {
      console.log('⚠️ PIN recovery attempt for non-existent user:', identifier);
      return res.status(403).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Only allow PIN recovery for Director role
    if (director.role !== 'director') {
      console.log('❌ PIN recovery attempted for non-director account:', { identifier, role: director.role });
      return res.status(403).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify director's password
    if (director.password !== password) {
      console.log('❌ PIN recovery attempted with incorrect password:', identifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if director is active
    const isActive = director.is_active === 1 || director.is_active === true || director.is_active === '1';
    if (!isActive) {
      console.log('❌ PIN recovery attempted for inactive director account:', identifier);
      return res.status(403).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    // Find target user (user whose PIN will be reset)
    const targetIdentifier = targetUserIdentifier || identifier;
    const targetUser = await db('users')
      .where(function() {
        this.where('email', targetIdentifier).orWhere('phone', targetIdentifier);
      })
      .first();

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found. Please check the email or phone number.'
      });
    }

    // Don't allow resetting PIN for directors (they use passwords)
    if (targetUser.role === 'director') {
      return res.status(403).json({
        success: false,
        message: 'Directors use passwords, not PINs. Please use password reset instead.'
      });
    }

    // Check if target user is active
    const targetIsActive = targetUser.is_active === 1 || targetUser.is_active === true || targetUser.is_active === '1';
    if (!targetIsActive) {
      console.log('❌ PIN recovery attempted for inactive target account:', targetIdentifier);
      return res.status(403).json({
        success: false,
        message: 'Target user account is disabled.'
      });
    }

    // Generate secure token (32 bytes, base64 encoded)
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Invalidate any existing unused tokens for this target user
    await db('pin_recovery_tokens')
      .where('user_id', targetUser.id)
      .where('used', 0)
      .where('expires_at', '>', new Date())
      .update({ used: 1, used_at: new Date() });

    // Create new recovery token (for target user, initiated by director)
    await db('pin_recovery_tokens').insert({
      user_id: targetUser.id,
      token: token,
      identifier: targetIdentifier,
      expires_at: expiresAt,
      used: 0,
      ip_address: ipAddress
    });

    // Log recovery request in audit logs (director initiated, for target user)
    await db('audit_logs').insert({
      entity_type: 'user',
      entity_id: targetUser.id,
      action: 'pin_recovery_requested',
      field: 'pin_recovery',
      old_value: null,
      new_value: 'recovery_token_generated',
      changed_by: director.id, // Director initiated
      reason: `PIN recovery requested by Director (${director.name}) for user ${targetUser.name}`,
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'] || 'unknown'
    });

    console.log('✅ PIN recovery token generated:', { 
      director: { id: director.id, name: director.name },
      targetUser: { id: targetUser.id, name: targetUser.name, role: targetUser.role }
    });

    // In production, you would send this token via email/SMS
    // For now, return it (in production, only log it and send via email)
    if (process.env.NODE_ENV === 'production') {
      // In production, don't return the token - send via email/SMS
      // For now, we'll return it but log a warning
      console.warn('⚠️ PRODUCTION: PIN recovery token should be sent via email/SMS, not returned in response');
    }

    res.json({
      success: true,
      message: 'Recovery token generated. Use this token to reset your PIN.',
      // In production, remove this and send token via email/SMS
      recoveryToken: process.env.NODE_ENV !== 'production' ? token : undefined,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('PIN recovery request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PIN Recovery - Verify token and reset PIN
router.post('/verify-pin-recovery', async (req, res) => {
  try {
    const { token, newPin } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (!token || !newPin) {
      return res.status(400).json({
        success: false,
        message: 'Token and new PIN are required'
      });
    }

    // Validate PIN format
    if (!/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be 4-6 digits'
      });
    }

    console.log('🔐 PIN recovery verification attempt:', { token: token.substring(0, 8) + '...', ipAddress });

    // Find recovery token
    const recoveryToken = await db('pin_recovery_tokens')
      .where('token', token)
      .where('used', 0)
      .first();

    if (!recoveryToken) {
      console.log('❌ Invalid or already used recovery token');
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired recovery token'
      });
    }

    // Check if token is expired
    if (new Date(recoveryToken.expires_at) < new Date()) {
      console.log('❌ Expired recovery token');
      await db('pin_recovery_tokens')
        .where('id', recoveryToken.id)
        .update({ used: 1, used_at: new Date() });
      
      return res.status(401).json({
        success: false,
        message: 'Recovery token has expired. Please request a new one.'
      });
    }

    // Get user
    const user = await db('users').where('id', recoveryToken.user_id).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new PIN
    const saltRounds = 10;
    const pinHash = await bcrypt.hash(newPin, saltRounds);

    // Update user PIN
    await db('users')
      .where('id', user.id)
      .update({
        pin_hash: pinHash,
        pin_reset_required: 0, // PIN is being set, no reset required
        updated_at: new Date().toISOString()
      });

    // Mark token as used
    await db('pin_recovery_tokens')
      .where('id', recoveryToken.id)
      .update({ used: 1, used_at: new Date() });

    // Log PIN reset in audit logs
    await db('audit_logs').insert({
      entity_type: 'user',
      entity_id: user.id,
      action: 'pin_reset_via_recovery',
      field: 'pin_hash',
      old_value: 'recovery_token_used',
      new_value: 'pin_reset_successful',
      changed_by: user.id, // Self-initiated
      reason: 'PIN reset via secure recovery token',
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'] || 'unknown'
    });

    console.log('✅ PIN reset successful via recovery token for user:', { id: user.id, name: user.name, role: user.role });

    res.json({
      success: true,
      message: 'PIN reset successfully. You can now login with your new PIN.'
    });

  } catch (error) {
    console.error('PIN recovery verification error:', error);
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

