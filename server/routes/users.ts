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

    // Check for duplicates
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
      password: password || null,
      pin_hash: pinHash,
      role,
      name,
      two_factor_enabled: twoFactorEnabled ? 1 : 0,
      is_active: isActive !== false ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: { id, ...req.body }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone or email already exists'
      });
    }
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

    const currentUser = await db('users').where('id', id).first();
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { phone, email, password, pin, role, name, twoFactorEnabled, isActive, pinResetRequired } = req.body;

    // Check for duplicates (excluding current user)
    if (phone || email) {
      const existing = await db('users')
        .where(function() {
          if (phone) {
            this.where('phone', phone);
          }
          if (email) {
            this.orWhere('email', email);
          }
        })
        .where('id', '!=', id)
        .first();

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'User with this phone or email already exists'
        });
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.password = password;
    if (role !== undefined) updateData.role = role;
    if (name !== undefined) updateData.name = name;
    if (twoFactorEnabled !== undefined) updateData.two_factor_enabled = twoFactorEnabled ? 1 : 0;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;
    if (pinResetRequired !== undefined) updateData.pin_reset_required = pinResetRequired ? 1 : 0;

    if (pin) {
      updateData.pin_hash = await bcrypt.hash(pin, 10);
    }

    await db('users').where('id', id).update(updateData);

    const updatedUser = await db('users').where('id', id).first();

    res.json({
      success: true,
      data: transformUser(updatedUser)
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone or email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset user PIN
router.post('/:id/reset-pin', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPin } = req.body;

    if (!newPin) {
      return res.status(400).json({
        success: false,
        message: 'New PIN is required'
      });
    }

    const user = await db('users').where('id', id).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const pinHash = await bcrypt.hash(newPin, 10);
    await db('users').where('id', id).update({
      pin_hash: pinHash,
      pin_reset_required: 0,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'PIN reset successfully'
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
// Clean data endpoint disabled - not available in production
// router.post('/clean-data', async (req, res) => {
//   try {
//     const { dataType } = req.body; // 'receptionist', 'storekeeper', or 'all'
//
//     if (!dataType || !['receptionist', 'storekeeper', 'all'].includes(dataType)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid data type. Must be "receptionist", "storekeeper", or "all"'
//       });
//     }
//
//     let deletedCount = 0;
//
//     if (dataType === 'receptionist' || dataType === 'all') {
//       // Delete all receptionist sales
//       const receptionistCount = await db('receptionist_sales').count('* as count').first();
//       await db('receptionist_sales').delete();
//       deletedCount += parseInt(receptionistCount?.count || '0');
//       console.log('✅ Cleaned receptionist sales:', receptionistCount?.count || 0);
//     }
//
//     if (dataType === 'storekeeper' || dataType === 'all') {
//       // Delete all storekeeper entries
//       const storekeeperCount = await db('storekeeper_entries').count('* as count').first();
//       await db('storekeeper_entries').delete();
//       deletedCount += parseInt(storekeeperCount?.count || '0');
//       console.log('✅ Cleaned storekeeper entries:', storekeeperCount?.count || 0);
//     }
//
//     if (dataType === 'all') {
//       // Also clean settlements related to receptionist sales
//       await db('settlements').delete();
//       await db('settlement_payments').delete();
//       console.log('✅ Cleaned settlements and settlement payments');
//     }
//
//     res.json({
//       success: true,
//       message: `Data cleaned successfully. Deleted ${deletedCount} records.`,
//       deletedCount
//     });
//   } catch (error) {
//     console.error('Error cleaning data:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// });

// Clean all data except settings and users
// Clean all data endpoint disabled - not available in production
// router.post('/clean-all-data', async (req, res) => {
//   try {
//     const results: any = {};
//
//     // Clean sales
//     const salesCount = await db('sales').count('* as count').first();
//     await db('sales').delete();
//     results.sales = parseInt(salesCount?.count || '0');
//     console.log('✅ Cleaned sales:', results.sales);
//
//     // Clean expenses
//     const expensesCount = await db('expenses').count('* as count').first();
//     await db('expenses').delete();
//     results.expenses = parseInt(expensesCount?.count || '0');
//     console.log('✅ Cleaned expenses:', results.expenses);
//
//     // Clean material purchases
//     const materialPurchasesCount = await db('material_purchases').count('* as count').first();
//     await db('material_purchases').delete();
//     results.materialPurchases = parseInt(materialPurchasesCount?.count || '0');
//     console.log('✅ Cleaned material purchases:', results.materialPurchases);
//
//     // Clean salary payments (commissions)
//     const salaryPaymentsCount = await db('salary_payments').count('* as count').first();
//     await db('salary_payments').delete();
//     results.salaryPayments = parseInt(salaryPaymentsCount?.count || '0');
//     console.log('✅ Cleaned salary payments:', results.salaryPayments);
//
//     // Clean employees
//     const employeesCount = await db('employees').count('* as count').first();
//     await db('employees').delete();
//     results.employees = parseInt(employeesCount?.count || '0');
//     console.log('✅ Cleaned employees:', results.employees);
//
//     // Clean receptionist sales
//     const receptionistSalesCount = await db('receptionist_sales').count('* as count').first();
//     await db('receptionist_sales').delete();
//     results.receptionistSales = parseInt(receptionistSalesCount?.count || '0');
//     console.log('✅ Cleaned receptionist sales:', results.receptionistSales);
//
//     // Clean storekeeper entries
//     const storekeeperEntriesCount = await db('storekeeper_entries').count('* as count').first();
//     await db('storekeeper_entries').delete();
//     results.storekeeperEntries = parseInt(storekeeperEntriesCount?.count || '0');
//     console.log('✅ Cleaned storekeeper entries:', results.storekeeperEntries);
//
//     // Clean settlements
//     const settlementsCount = await db('settlements').count('* as count').first();
//     await db('settlements').delete();
//     results.settlements = parseInt(settlementsCount?.count || '0');
//     console.log('✅ Cleaned settlements:', results.settlements);
//
//     // Clean settlement payments
//     const settlementPaymentsCount = await db('settlement_payments').count('* as count').first();
//     await db('settlement_payments').delete();
//     results.settlementPayments = parseInt(settlementPaymentsCount?.count || '0');
//     console.log('✅ Cleaned settlement payments:', results.settlementPayments);
//
//     // Clean audit logs (optional - you might want to keep these)
//     const auditLogsCount = await db('audit_logs').count('* as count').first();
//     await db('audit_logs').delete();
//     results.auditLogs = parseInt(auditLogsCount?.count || '0');
//     console.log('✅ Cleaned audit logs:', results.auditLogs);
//
//     // Clean notifications
//     const notificationsCount = await db('notifications').count('* as count').first();
//     await db('notifications').delete();
//     results.notifications = parseInt(notificationsCount?.count || '0');
//     console.log('✅ Cleaned notifications:', results.notifications);
//
//     // Clean recovery tokens
//     const pinRecoveryTokensCount = await db('pin_recovery_tokens').count('* as count').first();
//     await db('pin_recovery_tokens').delete();
//     results.pinRecoveryTokens = parseInt(pinRecoveryTokensCount?.count || '0');
//     console.log('✅ Cleaned PIN recovery tokens:', results.pinRecoveryTokens);
//
//     const passwordRecoveryTokensCount = await db('password_recovery_tokens').count('* as count').first();
//     await db('password_recovery_tokens').delete();
//     results.passwordRecoveryTokens = parseInt(passwordRecoveryTokensCount?.count || '0');
//     console.log('✅ Cleaned password recovery tokens:', results.passwordRecoveryTokens);
//
//     // Clean material prices (inventory/pricing configuration)
//     const materialPricesCount = await db('material_prices').count('* as count').first();
//     await db('material_prices').delete();
//     results.materialPrices = parseInt(materialPricesCount?.count || '0');
//     console.log('✅ Cleaned material prices:', results.materialPrices);
//
//     // Clean bag prices (pricing configuration)
//     const bagPricesCount = await db('bag_prices').count('* as count').first();
//     await db('bag_prices').delete();
//     results.bagPrices = parseInt(bagPricesCount?.count || '0');
//     console.log('✅ Cleaned bag prices:', results.bagPrices);
//
//     const totalDeleted = Object.values(results).reduce((sum: number, count: any) => sum + count, 0);
//
//     res.json({
//       success: true,
//       message: `All data cleaned successfully. Deleted ${totalDeleted} total records.`,
//       results,
//       totalDeleted
//     });
//   } catch (error) {
//     console.error('Error cleaning all data:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// });

export default router;
