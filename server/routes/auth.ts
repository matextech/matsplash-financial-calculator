import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TOTP } from 'otpauth';
import crypto from 'crypto';
import { db } from '../database';
import { config } from '../config';

const router = express.Router();

// Import rate limiter
import { rateLimiter } from '../middleware/rateLimiter';

// Login endpoint - with rate limiting
router.post('/login', rateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { identifier, passwordOrPin } = req.body;

    if (!identifier || !passwordOrPin) {
      return res.status(400).json({
        success: false,
        message: 'Email/Phone and Password/PIN are required'
      });
    }

    // Login attempt logged (no sensitive data)

    // Find user by email or phone (check active status separately for better error messages)
    const user = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .first();

    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ User not found:', identifier);
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('👤 User found:', { 
        id: user.id, 
        name: user.name, 
        role: user.role,
        email: user.email,
        phone: user.phone,
        is_active: user.is_active,
        is_active_type: typeof user.is_active
      });
    }

    // Check if user is active - handle different data types from SQLite
    const isActive = user.is_active === 1 || user.is_active === true || user.is_active === '1';
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Checking user active status:', { 
        id: user.id, 
        name: user.name, 
        is_active: user.is_active, 
        is_active_type: typeof user.is_active,
        isActive_result: isActive 
      });
    }
    
    if (!isActive) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚫 User is inactive - blocking login:', { 
          id: user.id, 
          name: user.name, 
          is_active: user.is_active, 
          is_active_type: typeof user.is_active 
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact administrator.'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ User is active, proceeding with credential verification');
    }

    // Verify password/PIN
    let isValid = false;
    if (user.role === 'director') {
      // Director uses password - check if it's hashed or plain text
      // If password starts with $2a$ or $2b$, it's bcrypt hashed
      if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
        // Password is hashed, use bcrypt.compare
        isValid = await bcrypt.compare(passwordOrPin, user.password);
      } else {
        // Password is plain text (legacy or development), compare directly
        isValid = user.password === passwordOrPin;
      }
    } else {
      // Other roles use PIN
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔑 Verifying PIN for role:', user.role);
        console.log('🔑 PIN hash exists:', !!user.pin_hash);
        console.log('🔑 PIN hash length:', user.pin_hash ? user.pin_hash.length : 0);
      }
      
      // Safety check: If PIN hash is missing, automatically set it to default '1234' (DEVELOPMENT ONLY)
      // In production, users must contact administrator to set their PIN
      if (!user.pin_hash && process.env.NODE_ENV !== 'production') {
        console.log('⚠️ PIN hash is missing for user. Auto-setting to default PIN (1234) - DEVELOPMENT ONLY:', { id: user.id, name: user.name, role: user.role });
        const defaultPinHash = await bcrypt.hash('1234', 10);
        await db('users').where('id', user.id).update({ pin_hash: defaultPinHash });
        user.pin_hash = defaultPinHash; // Update local user object
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Default PIN hash set for user:', user.id);
        }
      } else if (!user.pin_hash) {
        // Production: PIN must be set by administrator
        if (process.env.NODE_ENV !== 'production') {
          console.log('❌ PIN hash is missing for user in PRODUCTION:', { id: user.id, name: user.name, role: user.role });
        }
        return res.status(401).json({
          success: false,
          message: 'PIN not set. Please contact administrator.'
        });
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔑 Testing provided PIN:', passwordOrPin);
      }
      isValid = await bcrypt.compare(passwordOrPin, user.pin_hash);
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔑 PIN verification result:', isValid);
      }
      
      // If verification failed, also test with default PIN '1234' for debugging
      if (!isValid) {
        const testDefaultPin = await bcrypt.compare('1234', user.pin_hash);
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔑 Testing default PIN (1234) for comparison:', testDefaultPin);
        }
      }
    }

    if (!isValid) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ Invalid credentials for user:', { 
          id: user.id, 
          name: user.name, 
          role: user.role,
          hasPassword: !!user.password,
          hasPinHash: !!user.pin_hash,
          pinHashLength: user.pin_hash ? user.pin_hash.length : 0
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Credentials valid for user:', { id: user.id, name: user.name, role: user.role });
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

    if (process.env.NODE_ENV !== 'production') {
      console.log('Login successful for:', user.name, 'PIN reset required:', pinResetRequired);
    }

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

    if (process.env.NODE_ENV !== 'production') {
      console.log('PIN changed successfully for user:', userId);
    }

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

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: number; role: string };

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
if (process.env.NODE_ENV !== 'production') {
  console.log('🔐 Registering /enable-2fa route');
}
router.post('/enable-2fa', async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔐 Enable 2FA endpoint called');
  }
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

    if (process.env.NODE_ENV !== 'production') {
      console.log('2FA enabled for user:', userId);
    }

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

    if (process.env.NODE_ENV !== 'production') {
      console.log('2FA disabled for user:', userId);
    }

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

// Verify 2FA code endpoint (for login with 2FA) - with rate limiting
router.post('/verify-2fa', rateLimiter(10, 15 * 60 * 1000), async (req, res) => {
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('Checking user active status in verify-2fa:', { 
        id: user.id, 
        name: user.name, 
        is_active: user.is_active, 
        is_active_type: typeof user.is_active,
        isActive_result: isActive 
      });
    }
    
    if (!isActive) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('User is inactive in verify-2fa:', { id: user.id, name: user.name, is_active: user.is_active, is_active_type: typeof user.is_active });
      }
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact administrator.'
      });
    }

    // Verify password/PIN
    let isValid = false;
    if (user.role === 'director') {
      // Director uses password - check if it's hashed or plain text
      if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
        // Password is hashed, use bcrypt.compare
        isValid = await bcrypt.compare(passwordOrPin, user.password);
      } else {
        // Password is plain text (legacy or development), compare directly
        isValid = user.password === passwordOrPin;
      }
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

// Verify 2FA code for authenticated user (for password reset in dashboard)
router.post('/verify-2fa-authenticated', async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'User ID and 2FA code are required'
      });
    }

    // Verify JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);
    let decoded: { userId: number; role: string };
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { userId: number; role: string };
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Verify the user ID matches the token
    if (decoded.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'User ID mismatch'
      });
    }

    // Get user from database
    const user = await db('users').where('id', userId).first();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    const isActive = user.is_active === 1 || user.is_active === true || user.is_active === '1';
    if (!isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    // Check if 2FA is enabled
    const twoFactorEnabled = user.two_factor_enabled === 1 || user.two_factor_enabled === true;
    if (!twoFactorEnabled) {
      return res.status(403).json({
        success: false,
        message: '2FA is not enabled for this account'
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

      const delta = totp.validate({ token: code, window: 2 });
      if (delta === null) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
        });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ 2FA verified for authenticated user:', { userId: user.id, name: user.name });
      }

      return res.json({
        success: true,
        message: '2FA code verified successfully'
      });
    } catch (error) {
      console.error('2FA verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying 2FA code'
      });
    }

  } catch (error) {
    console.error('Verify 2FA authenticated error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify director password (for PIN reset operations)
router.post('/verify-director-password', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifier and password are required'
      });
    }

    // Find director by email or phone
    const director = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .first();

    if (!director || director.role !== 'director') {
      // Don't reveal if user exists (security best practice)
      return res.json({
        success: true,
        isValid: false
      });
    }

    // Check if director is active
    const isActive = director.is_active === 1 || director.is_active === true || director.is_active === '1';
    if (!isActive) {
      return res.json({
        success: true,
        isValid: false
      });
    }

    // Verify password - check if it's hashed or plain text
    let isValid: boolean;
    if (director.password && (director.password.startsWith('$2a$') || director.password.startsWith('$2b$'))) {
      // Password is hashed, use bcrypt.compare
      isValid = await bcrypt.compare(password, director.password);
    } else {
      // Password is plain text (legacy or development), compare directly
      isValid = director.password === password;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Password verification:', { identifier, isValid, timestamp: new Date().toISOString() });
    }

    return res.json({
      success: true,
      isValid: isValid
    });

  } catch (error) {
    console.error('Verify password error:', error);
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

// Password Recovery - Request recovery token (for directors only, requires 2FA)
router.post('/request-password-recovery', async (req, res) => {
  try {
    const { identifier, twoFactorCode } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    if (!twoFactorCode) {
      return res.status(400).json({
        success: false,
        message: '2FA code is required for password recovery'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Password recovery requested:', { identifier, ipAddress, timestamp: new Date().toISOString() });
    }

    // Find director by email or phone (must be director)
    const director = await db('users')
      .where(function() {
        this.where('email', identifier).orWhere('phone', identifier);
      })
      .first();

    if (!director) {
      console.log('⚠️ Password recovery attempt for non-existent user:', identifier);
      return res.status(403).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Only allow password recovery for Director role
    if (director.role !== 'director') {
      console.log('❌ Password recovery attempted for non-director account:', { identifier, role: director.role });
      return res.status(403).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if director is active
    const isActive = director.is_active === 1 || director.is_active === true || director.is_active === '1';
    if (!isActive) {
      console.log('❌ Password recovery attempted for inactive director account:', identifier);
      return res.status(403).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    // Check if 2FA is enabled
    const twoFactorEnabled = director.two_factor_enabled === 1 || director.two_factor_enabled === true;
    if (!twoFactorEnabled) {
      return res.status(403).json({
        success: false,
        message: '2FA must be enabled for password recovery. Please enable 2FA first.'
      });
    }

    // Verify 2FA code
    if (!director.two_factor_secret) {
      return res.status(500).json({
        success: false,
        message: '2FA is enabled but secret is missing. Please contact administrator.'
      });
    }

    try {
      const totp = new TOTP({
        secret: director.two_factor_secret,
      });
      const isValid2FA = totp.validate({ token: twoFactorCode, window: 2 }) !== null;

      if (!isValid2FA) {
        console.log('❌ Password recovery attempted with invalid 2FA code:', identifier);
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
        });
      }
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying 2FA code'
      });
    }

    // Generate secure token (32 bytes, base64 encoded)
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Invalidate any existing unused tokens for this director
    await db('password_recovery_tokens')
      .where('user_id', director.id)
      .where('used', 0)
      .where('expires_at', '>', new Date())
      .update({ used: 1, used_at: new Date() });

    // Create new recovery token
    await db('password_recovery_tokens').insert({
      user_id: director.id,
      token: token,
      identifier: identifier,
      two_factor_code: twoFactorCode,
      expires_at: expiresAt,
      used: 0,
      ip_address: ipAddress
    });

    // Log recovery request in audit logs
    await db('audit_logs').insert({
      entity_type: 'user',
      entity_id: director.id,
      action: 'password_recovery_requested',
      field: 'password_recovery',
      old_value: null,
      new_value: 'recovery_token_generated',
      changed_by: director.id, // Self-initiated
      reason: 'Password recovery requested via 2FA verification',
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'] || 'unknown'
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Password recovery token generated for director:', { id: director.id, name: director.name });
    }

    // In production, send token via email/SMS
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ PRODUCTION: Password recovery token should be sent via email/SMS, not returned in response');
    }

    res.json({
      success: true,
      message: 'Recovery token generated. Use this token to reset your password.',
      // In production, remove this and send token via email/SMS
      recoveryToken: process.env.NODE_ENV !== 'production' ? token : undefined,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Password recovery request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Password Recovery - Verify token and reset password
router.post('/verify-password-recovery', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password (minimum 6 characters)
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Password recovery verification attempt logged (token masked)

    // Find recovery token
    const recoveryToken = await db('password_recovery_tokens')
      .where('token', token)
      .where('used', 0)
      .first();

    if (!recoveryToken) {
      console.log('❌ Invalid or already used password recovery token');
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired recovery token'
      });
    }

    // Check if token is expired
    if (new Date(recoveryToken.expires_at) < new Date()) {
      console.log('❌ Expired password recovery token');
      await db('password_recovery_tokens')
        .where('id', recoveryToken.id)
        .update({ used: 1, used_at: new Date() });
      
      return res.status(401).json({
        success: false,
        message: 'Recovery token has expired. Please request a new one.'
      });
    }

    // Get director
    const director = await db('users').where('id', recoveryToken.user_id).first();
    if (!director) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update director password (hash with bcrypt)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('users')
      .where('id', director.id)
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      });

    // Mark token as used
    await db('password_recovery_tokens')
      .where('id', recoveryToken.id)
      .update({ used: 1, used_at: new Date() });

    // Log password reset in audit logs
    await db('audit_logs').insert({
      entity_type: 'user',
      entity_id: director.id,
      action: 'password_reset_via_recovery',
      field: 'password',
      old_value: 'recovery_token_used',
      new_value: 'password_reset_successful',
      changed_by: director.id, // Self-initiated
      reason: 'Password reset via secure recovery token with 2FA',
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'] || 'unknown'
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Password reset successful via recovery token for director:', { id: director.id, name: director.name });
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password recovery verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PIN Recovery routes removed - 2FA is sufficient for security

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

