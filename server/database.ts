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
        table.boolean('pin_reset_required').defaultTo(false);
        table.string('role').notNullable(); // director, manager, receptionist, storekeeper
        table.string('name').notNullable();
        table.string('two_factor_secret');
        table.boolean('two_factor_enabled').defaultTo(false);
        table.boolean('is_active').defaultTo(true);
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
        table.timestamp('updated_at').defaultTo(db.fn.now());
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
        table.boolean('is_submitted').defaultTo(false);
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
        table.boolean('is_submitted').defaultTo(false);
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
        table.boolean('is_settled').defaultTo(false);
        table.integer('settled_by').notNullable();
        table.timestamp('settled_at');
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.index('date');
        table.index('receptionist_sale_id');
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
        table.boolean('is_read').defaultTo(false);
        table.string('related_entity_type');
        table.integer('related_entity_id');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index('user_id');
        table.index('is_read');
      });
      
      console.log('Database tables created successfully');
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
      two_factor_enabled: false,
      is_active: true
    });
    
    // Manager
    const managerPinHash = await bcrypt.hash('1234', 10);
    await db('users').insert({
      name: 'Manager',
      email: 'manager@matsplash.com',
      phone: '08012345678',
      pin_hash: managerPinHash,
      role: 'manager',
      two_factor_enabled: false,
      is_active: true
    });
    
    // Receptionist
    const receptionistPinHash = await bcrypt.hash('1234', 10);
    await db('users').insert({
      name: 'Receptionist',
      email: 'receptionist@matsplash.com',
      phone: '08012345679',
      pin_hash: receptionistPinHash,
      role: 'receptionist',
      two_factor_enabled: false,
      is_active: true
    });
    
    // Storekeeper
    const storekeeperPinHash = await bcrypt.hash('1234', 10);
    await db('users').insert({
      name: 'Storekeeper',
      email: 'storekeeper@matsplash.com',
      phone: '08012345680',
      pin_hash: storekeeperPinHash,
      role: 'storekeeper',
      two_factor_enabled: false,
      is_active: true
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
    
    console.log('Default users and settings initialized');
  } catch (error) {
    console.error('Error initializing default users:', error);
    // Don't throw - allow server to start even if initialization fails
  }
}

