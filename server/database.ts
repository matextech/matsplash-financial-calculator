import knex, { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { config } from './config';

// Database configuration
import path from 'path';
const dbPath = path.resolve(process.cwd(), config.database.filename);
console.log('Database path:', dbPath);

const knexConfig: Knex.Config = {
  client: 'sqlite3',
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  }
};

export const db = knex(knexConfig);

// Initialize database tables
export default async function setupDatabase(): Promise<void> {
  try {
    console.log('🔄 Checking database tables...');
    // Check if users table exists
    const hasUsersTable = await db.schema.hasTable('users');
    console.log('Users table exists:', hasUsersTable);
    
    if (!hasUsersTable) {
      console.log('Creating database tables...');
      
      // Users table
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('phone').notNullable();
        table.string('email');
        table.string('password'); // For director
        table.string('pin_hash'); // Hashed PIN for other roles
        table.integer('pin_reset_required').defaultTo(0); // SQLite uses 0/1 for boolean
        table.string('role').notNullable(); // director, manager, receptionist, storekeeper
        table.string('name').notNullable();
        table.string('two_factor_secret');
        table.integer('two_factor_enabled').defaultTo(0); // SQLite uses 0/1 for boolean
        table.integer('is_active').defaultTo(1); // SQLite uses 0/1 for boolean
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('last_login');
        table.unique(['phone']);
        table.unique(['email']);
        table.index('role');
      });
      
      // Employees table (for drivers, packers)
      await db.schema.createTable('employees', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').notNullable().unique();
        table.string('phone');
        table.string('role'); // Driver, Packers
        table.string('salary_type').notNullable(); // fixed, commission, both
        table.decimal('fixed_salary', 10, 2);
        table.decimal('commission_rate', 10, 2);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      
      // Expenses table
      await db.schema.createTable('expenses', (table) => {
        table.increments('id').primary();
        table.string('type').notNullable(); // fuel, driver_fuel, other
        table.string('description').notNullable();
        table.decimal('amount', 10, 2).notNullable();
        table.date('date').notNullable();
        table.string('reference');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('date');
        table.index('type');
      });
      
      // Material purchases table
      await db.schema.createTable('material_purchases', (table) => {
        table.increments('id').primary();
        table.string('type').notNullable(); // sachet_roll, packing_nylon
        table.integer('quantity').notNullable();
        table.decimal('cost', 10, 2).notNullable();
        table.date('date').notNullable();
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('date');
        table.index('type');
      });
      
      // Sales table
      await db.schema.createTable('sales', (table) => {
        table.increments('id').primary();
        table.string('driver_name').notNullable();
        table.string('driver_email');
        table.integer('employee_id');
        table.integer('bags_sold').notNullable();
        table.decimal('price_per_bag', 10, 2).notNullable();
        table.decimal('total_amount', 10, 2).notNullable();
        table.date('date').notNullable();
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('date');
        table.index('driver_email');
        table.index('employee_id');
      });
      
      // Packer entries table
      await db.schema.createTable('packer_entries', (table) => {
        table.increments('id').primary();
        table.string('packer_name').notNullable();
        table.string('packer_email');
        table.integer('employee_id');
        table.integer('bags_packed').notNullable();
        table.date('date').notNullable();
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('date');
        table.index('employee_id');
        table.index('packer_name');
      });
      
      // Salary payments table
      await db.schema.createTable('salary_payments', (table) => {
        table.increments('id').primary();
        table.integer('employee_id').notNullable();
        table.string('employee_name').notNullable();
        table.decimal('fixed_salary', 10, 2);
        table.decimal('commission', 10, 2);
        table.decimal('total_amount', 10, 2).notNullable();
        table.string('period').notNullable(); // daily, weekly, monthly, first_half, second_half
        table.date('period_start').notNullable();
        table.date('period_end').notNullable();
        table.date('payment_date').notNullable();
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('employee_id');
        table.index('payment_date');
        table.index('period');
      });
      
      // Settings table
      await db.schema.createTable('settings', (table) => {
        table.increments('id').primary();
        table.decimal('sachet_roll_cost', 10, 2).defaultTo(31000);
        table.integer('sachet_roll_bags_per_roll').defaultTo(450);
        table.decimal('packing_nylon_cost', 10, 2).defaultTo(100000);
        table.integer('packing_nylon_bags_per_package').defaultTo(10000);
        table.decimal('sales_price_1', 10, 2).defaultTo(250);
        table.decimal('sales_price_2', 10, 2).defaultTo(270);
        table.integer('inventory_low_threshold').defaultTo(4000); // Alert when bags below this number
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      
      // Bag Prices table (dynamic unlimited prices)
      await db.schema.createTable('bag_prices', (table) => {
        table.increments('id').primary();
        table.decimal('price', 10, 2).notNullable();
        table.string('label'); // Optional label like "Standard", "Premium"
        table.integer('sort_order').defaultTo(0); // For ordering prices
        table.integer('is_active').defaultTo(1); // Can disable prices
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.index('is_active');
        table.index('sort_order');
      });
      
      // Receptionist sales table
      await db.schema.createTable('receptionist_sales', (table) => {
        table.increments('id').primary();
        table.date('date').notNullable();
        table.integer('driver_id');
        table.string('driver_name');
        table.string('sale_type').notNullable(); // driver, general, mini_store
        table.integer('bags_at_price_1').defaultTo(0);
        table.integer('bags_at_price_2').defaultTo(0);
        table.integer('total_bags').notNullable();
        table.integer('submitted_by').notNullable();
        table.timestamp('submitted_at').defaultTo(db.fn.now());
        table.integer('is_submitted').defaultTo(0); // SQLite uses 0/1 for boolean
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.index('date');
        table.index('driver_id');
        table.index('submitted_by');
      });
      
      // Storekeeper entries table
      await db.schema.createTable('storekeeper_entries', (table) => {
        table.increments('id').primary();
        table.date('date').notNullable();
        table.string('entry_type').notNullable(); // driver_pickup, general_sales, packer_production, ministore_pickup
        table.integer('driver_id');
        table.string('driver_name');
        table.integer('packer_id');
        table.string('packer_name');
        table.integer('bags_count').notNullable();
        table.integer('submitted_by').notNullable();
        table.timestamp('submitted_at').defaultTo(db.fn.now());
        table.integer('is_submitted').defaultTo(0); // SQLite uses 0/1 for boolean
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.index('date');
        table.index('entry_type');
      });
      
      // Settlements table
      await db.schema.createTable('settlements', (table) => {
        table.increments('id').primary();
        table.date('date').notNullable();
        table.integer('receptionist_sale_id').notNullable();
        table.decimal('expected_amount', 10, 2).notNullable();
        table.decimal('settled_amount', 10, 2).notNullable();
        table.decimal('remaining_balance', 10, 2).notNullable();
        table.integer('is_settled').defaultTo(0); // SQLite uses 0/1 for boolean
        table.integer('settled_by').notNullable();
        table.timestamp('settled_at');
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.index('date');
        table.index('receptionist_sale_id');
      });
      
      // Settlement payments table (tracks individual payment transactions)
      await db.schema.createTable('settlement_payments', (table) => {
        table.increments('id').primary();
        table.integer('settlement_id').notNullable();
        table.decimal('amount', 10, 2).notNullable();
        table.integer('paid_by').notNullable(); // user_id who recorded the payment
        table.timestamp('paid_at').notNullable();
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.foreign('settlement_id').references('id').inTable('settlements').onDelete('CASCADE');
        table.index('settlement_id');
        table.index('paid_at');
      });
      
      // Audit logs table
      await db.schema.createTable('audit_logs', (table) => {
        table.increments('id').primary();
        table.string('entity_type').notNullable();
        table.integer('entity_id').notNullable();
        table.string('action').notNullable();
        table.string('field');
        table.text('old_value');
        table.text('new_value');
        table.integer('changed_by').notNullable();
        table.timestamp('changed_at').defaultTo(db.fn.now());
        table.text('reason');
        table.string('ip_address');
        table.text('user_agent');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('entity_type');
        table.index('entity_id');
        table.index('changed_by');
        table.index('changed_at');
      });
      
      // Notifications table
      await db.schema.createTable('notifications', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable();
        table.string('type').notNullable();
        table.string('title').notNullable();
        table.text('message').notNullable();
        table.integer('is_read').defaultTo(0); // SQLite uses 0/1 for boolean
        table.string('related_entity_type');
        table.integer('related_entity_id');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('user_id');
        table.index('is_read');
      });
      
      // PIN recovery tokens table (for managers, receptionists, storekeepers - NOT directors)
      await db.schema.createTable('pin_recovery_tokens', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable();
        table.string('token').notNullable().unique();
        table.string('identifier').notNullable(); // email or phone used for verification
        table.timestamp('expires_at').notNullable();
        table.integer('used').defaultTo(0); // SQLite uses 0/1 for boolean
        table.string('ip_address');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('used_at');
        table.index('token');
        table.index('user_id');
        table.index('expires_at');
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      });
      
      // Password recovery tokens table (for directors only - requires 2FA)
      await db.schema.createTable('password_recovery_tokens', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable();
        table.string('token').notNullable().unique();
        table.string('identifier').notNullable(); // email or phone used for verification
        table.string('two_factor_code').notNullable(); // 2FA code used for verification
        table.timestamp('expires_at').notNullable();
        table.integer('used').defaultTo(0); // SQLite uses 0/1 for boolean
        table.string('ip_address');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('used_at');
        table.index('token');
        table.index('user_id');
        table.index('expires_at');
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      });
      
      console.log('Database tables created successfully');
    }
    
    // Check and add inventory_low_threshold column to settings table if it doesn't exist
    const hasSettingsTable = await db.schema.hasTable('settings');
    if (hasSettingsTable) {
      try {
        // Try to query the column - if it fails, the column doesn't exist
        await db('settings').select('inventory_low_threshold').limit(1);
        console.log('✅ inventory_low_threshold column already exists');
      } catch (error: any) {
        // Column doesn't exist, add it using raw SQL (SQLite limitation)
        if (error.message && error.message.includes('no such column')) {
          console.log('📋 Adding inventory_low_threshold column to settings table...');
          try {
            // SQLite doesn't support ALTER TABLE ADD COLUMN in Knex easily, use raw SQL
            await db.raw('ALTER TABLE settings ADD COLUMN inventory_low_threshold INTEGER DEFAULT 4000');
            console.log('✅ inventory_low_threshold column added successfully');
            
            // Update existing records with default value
            await db('settings').update({ inventory_low_threshold: 4000 });
            console.log('✅ Updated existing settings with default inventory_low_threshold (4000)');
          } catch (alterError: any) {
            console.error('❌ Error adding inventory_low_threshold column:', alterError);
            // Don't throw - allow app to continue with default value in code
          }
        } else {
          console.error('❌ Unexpected error checking inventory_low_threshold column:', error);
        }
      }
    }
    
    // Check and create settlement_payments table if it doesn't exist (for existing databases)
    const hasSettlementPaymentsTable = await db.schema.hasTable('settlement_payments');
    if (!hasSettlementPaymentsTable) {
      console.log('Creating settlement_payments table...');
      await db.schema.createTable('settlement_payments', (table) => {
        table.increments('id').primary();
        table.integer('settlement_id').notNullable();
        table.decimal('amount', 10, 2).notNullable();
        table.integer('paid_by').notNullable(); // user_id who recorded the payment
        table.timestamp('paid_at').notNullable();
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.foreign('settlement_id').references('id').inTable('settlements').onDelete('CASCADE');
        table.index('settlement_id');
        table.index('paid_at');
      });
      console.log('settlement_payments table created successfully');
    }
    
    // Check and create pin_recovery_tokens table if it doesn't exist (for existing databases)
    const hasPinRecoveryTable = await db.schema.hasTable('pin_recovery_tokens');
    if (!hasPinRecoveryTable) {
      console.log('Creating pin_recovery_tokens table...');
      await db.schema.createTable('pin_recovery_tokens', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable();
        table.string('token').notNullable().unique();
        table.string('identifier').notNullable(); // email or phone used for verification
        table.timestamp('expires_at').notNullable();
        table.integer('used').defaultTo(0); // SQLite uses 0/1 for boolean
        table.string('ip_address');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('used_at');
        table.index('token');
        table.index('user_id');
        table.index('expires_at');
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      });
      console.log('pin_recovery_tokens table created successfully');
    }
    
    // Check and create password_recovery_tokens table if it doesn't exist (for existing databases)
    const hasPasswordRecoveryTable = await db.schema.hasTable('password_recovery_tokens');
    if (!hasPasswordRecoveryTable) {
      console.log('Creating password_recovery_tokens table...');
      await db.schema.createTable('password_recovery_tokens', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable();
        table.string('token').notNullable().unique();
        table.string('identifier').notNullable(); // email or phone used for verification
        table.string('two_factor_code').notNullable(); // 2FA code used for verification
        table.timestamp('expires_at').notNullable();
        table.integer('used').defaultTo(0); // SQLite uses 0/1 for boolean
        table.string('ip_address');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('used_at');
        table.index('token');
        table.index('user_id');
        table.index('expires_at');
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      });
      console.log('password_recovery_tokens table created successfully');
    }
    
    // Check and create audit_logs table if it doesn't exist (for existing databases)
    const hasAuditLogsTable = await db.schema.hasTable('audit_logs');
    if (!hasAuditLogsTable) {
      console.log('Creating audit_logs table...');
      await db.schema.createTable('audit_logs', (table) => {
        table.increments('id').primary();
        table.string('entity_type').notNullable();
        table.integer('entity_id').notNullable();
        table.string('action').notNullable();
        table.string('field');
        table.text('old_value');
        table.text('new_value');
        table.integer('changed_by').notNullable();
        table.timestamp('changed_at').defaultTo(db.fn.now());
        table.text('reason');
        table.string('ip_address');
        table.text('user_agent');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('entity_type');
        table.index('entity_id');
        table.index('changed_by');
        table.index('changed_at');
      });
      console.log('audit_logs table created successfully');
    } else {
      // Check if created_at column exists, add it if missing
      const hasCreatedAt = await db.schema.hasColumn('audit_logs', 'created_at');
      if (!hasCreatedAt) {
        console.log('Adding created_at column to audit_logs table...');
        await db.schema.alterTable('audit_logs', (table) => {
          table.timestamp('created_at').defaultTo(db.fn.now());
        });
        console.log('created_at column added to audit_logs successfully');
      }
    }
    
    // Add price_breakdown and expected_amount columns to receptionist_sales for dynamic pricing (if they don't exist)
    const hasReceptionistSales = await db.schema.hasTable('receptionist_sales');
    if (hasReceptionistSales) {
      const hasPriceBreakdown = await db.schema.hasColumn('receptionist_sales', 'price_breakdown');
      if (!hasPriceBreakdown) {
        console.log('Adding price_breakdown column to receptionist_sales...');
        await db.schema.alterTable('receptionist_sales', (table) => {
          table.text('price_breakdown'); // JSON: [{ priceId: 1, amount: 250, bags: 100 }, ...]
        });
        console.log('price_breakdown column added successfully');
      }
      
      const hasExpectedAmount = await db.schema.hasColumn('receptionist_sales', 'expected_amount');
      if (!hasExpectedAmount) {
        console.log('Adding expected_amount column to receptionist_sales...');
        await db.schema.alterTable('receptionist_sales', (table) => {
          table.decimal('expected_amount', 10, 2).defaultTo(0);
        });
        console.log('expected_amount column added successfully');
      }
    }
    
    // Add material price ID columns to sales table (if they don't exist)
    const hasSalesTable = await db.schema.hasTable('sales');
    if (hasSalesTable) {
      const hasSachetRollPriceId = await db.schema.hasColumn('sales', 'sachet_roll_price_id');
      if (!hasSachetRollPriceId) {
        console.log('Adding sachet_roll_price_id column to sales...');
        await db.schema.alterTable('sales', (table) => {
          table.integer('sachet_roll_price_id');
        });
        console.log('sachet_roll_price_id column added successfully');
      }
      
      const hasPackingNylonPriceId = await db.schema.hasColumn('sales', 'packing_nylon_price_id');
      if (!hasPackingNylonPriceId) {
        console.log('Adding packing_nylon_price_id column to sales...');
        await db.schema.alterTable('sales', (table) => {
          table.integer('packing_nylon_price_id');
        });
        console.log('packing_nylon_price_id column added successfully');
      }
    }
    
    // Check and create material_prices table if it doesn't exist (for existing databases)
    const hasMaterialPricesTable = await db.schema.hasTable('material_prices');
    if (!hasMaterialPricesTable) {
      console.log('Creating material_prices table...');
      await db.schema.createTable('material_prices', (table) => {
        table.increments('id').primary();
        table.string('type').notNullable(); // 'sachet_roll' or 'packing_nylon'
        table.decimal('cost', 10, 2).notNullable(); // Cost per roll/package
        table.integer('bags_per_unit').notNullable(); // Number of bags per roll/package
        table.string('label'); // Optional label
        table.integer('sort_order').defaultTo(0);
        table.integer('is_active').defaultTo(1); // SQLite uses 0/1 for boolean
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.index('type');
        table.index('is_active');
      });
      console.log('material_prices table created successfully');
      
      // Initialize default material prices
      const materialPricesCount = await db('material_prices').count('id as count').first();
      if (materialPricesCount && Number(materialPricesCount.count) === 0) {
        await db('material_prices').insert([
          { type: 'sachet_roll', cost: 31000, bags_per_unit: 450, label: 'Standard Roll', sort_order: 1, is_active: 1 },
          { type: 'packing_nylon', cost: 100000, bags_per_unit: 10000, label: 'Standard Package', sort_order: 1, is_active: 1 }
        ]);
        console.log('Default material prices initialized');
      }
    }
    
      // Check and create packer_entries table if it doesn't exist (for existing databases)
      const hasPackerEntriesTable = await db.schema.hasTable('packer_entries');
      if (!hasPackerEntriesTable) {
        console.log('Creating packer_entries table...');
        await db.schema.createTable('packer_entries', (table) => {
          table.increments('id').primary();
          table.string('packer_name').notNullable();
          table.string('packer_email');
          table.integer('employee_id');
          table.integer('bags_packed').notNullable();
          table.date('date').notNullable();
          table.text('notes');
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.index('date');
          table.index('employee_id');
          table.index('packer_name');
        });
        console.log('packer_entries table created successfully');
      }
      
      // Initialize default users if they don't exist
      await initializeDefaultUsers();
      
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

async function initializeDefaultUsers(): Promise<void> {
  try {
    // Check if any users exist
    const userCount = await db('users').count('id as count').first();
    if (userCount && Number(userCount.count) > 0) {
      console.log('Users already exist, skipping initialization');
      return;
    }
    
    console.log('Initializing default users...');
    
    // Director
    const directorPinHash = await bcrypt.hash('admin123', 10);
    await db('users').insert({
      name: 'Director',
      email: 'director@matsplash.com',
      phone: '08000000000',
      password: 'admin123', // In production, hash this
      role: 'director',
      two_factor_enabled: 0, // SQLite uses 0/1
      is_active: 1 // SQLite uses 0/1
    });
    
    // Manager
    const managerPinHash = await bcrypt.hash('1234', 10);
    await db('users').insert({
      name: 'Manager',
      email: 'manager@matsplash.com',
      phone: '08012345678',
      pin_hash: managerPinHash,
      role: 'manager',
      pin_reset_required: 0, // Default PIN is known, no reset needed
      two_factor_enabled: 0, // SQLite uses 0/1
      is_active: 1 // SQLite uses 0/1
    });
    
    // Receptionist
    const receptionistPinHash = await bcrypt.hash('1234', 10);
    await db('users').insert({
      name: 'Receptionist',
      email: 'receptionist@matsplash.com',
      phone: '08012345679',
      pin_hash: receptionistPinHash,
      role: 'receptionist',
      pin_reset_required: 0, // Default PIN is known, no reset needed
      two_factor_enabled: 0, // SQLite uses 0/1
      is_active: 1 // SQLite uses 0/1
    });
    
    // Storekeeper
    const storekeeperPinHash = await bcrypt.hash('1234', 10);
    await db('users').insert({
      name: 'Storekeeper',
      email: 'storekeeper@matsplash.com',
      phone: '08012345680',
      pin_hash: storekeeperPinHash,
      role: 'storekeeper',
      pin_reset_required: 0, // Default PIN is known, no reset needed
      two_factor_enabled: 0, // SQLite uses 0/1
      is_active: 1 // SQLite uses 0/1
    });
    
    // Initialize default settings (only if none exist)
    const settingsCount = await db('settings').count('id as count').first();
    if (settingsCount && Number(settingsCount.count) === 0) {
      await db('settings').insert({
        sachet_roll_cost: 31000,
        sachet_roll_bags_per_roll: 450,
        packing_nylon_cost: 100000,
        packing_nylon_bags_per_package: 10000,
        sales_price_1: 250,
        sales_price_2: 270
      });
    }
    
    // Initialize default bag prices (only if none exist)
    const bagPricesCount = await db('bag_prices').count('id as count').first();
    if (bagPricesCount && Number(bagPricesCount.count) === 0) {
      await db('bag_prices').insert([
        { price: 250, label: 'Standard', sort_order: 1, is_active: 1 },
        { price: 270, label: 'Premium', sort_order: 2, is_active: 1 }
      ]);
    }
    
    console.log('Default users, settings, and bag prices initialized');
  } catch (error) {
    console.error('Error initializing default users:', error);
    // Don't throw - allow server to start even if initialization fails
  }
}

