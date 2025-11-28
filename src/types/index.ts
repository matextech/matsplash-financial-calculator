export interface Employee {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  role?: 'Driver' | 'Packers' | 'Manager' | 'General';
  salaryType: 'fixed' | 'commission' | 'both';
  fixedSalary?: number;
  commissionRate?: number; // Fixed amount per bag (e.g., ₦15 for drivers, ₦4 for packers)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Expense {
  id?: number;
  type: 'fuel' | 'driver_fuel' | 'other';
  description: string;
  amount: number;
  date: Date;
  reference?: string; // For trip reference, etc.
  createdAt?: Date;
}

export interface MaterialPurchase {
  id?: number;
  type: 'sachet_roll' | 'packing_nylon';
  quantity: number;
  cost: number;
  date: Date;
  notes?: string;
  createdAt?: Date;
}

export interface Sale {
  id?: number;
  driverName: string;
  driverEmail?: string;
  employeeId?: number; // Link to employee record for commission calculation
  bagsSold: number;
  pricePerBag: number;
  totalAmount: number;
  date: Date;
  notes?: string;
  // Material price selections (optional - for profit calculations)
  sachetRollPriceId?: number; // Selected sachet roll price model
  packingNylonPriceId?: number; // Selected packing nylon price model
  createdAt?: Date;
}

export interface PackerEntry {
  id?: number;
  packerName: string;
  packerEmail?: string;
  employeeId?: number; // Link to employee record for commission calculation
  bagsPacked: number;
  date: Date;
  notes?: string;
  createdAt?: Date;
}

export interface SalaryPayment {
  id?: number;
  employeeId: number;
  employeeName: string;
  period: 'first_half' | 'second_half' | 'daily' | 'weekly' | 'monthly'; // first_half: 1st-15th (paid 18th), second_half: 16th-end (paid 5th)
  periodStart: Date;
  periodEnd: Date;
  fixedAmount?: number;
  commissionAmount?: number;
  totalBags?: number; // For commission calculation
  totalAmount: number;
  paidDate: Date;
  notes?: string;
  createdAt?: Date;
}

export interface FinancialReport {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalExpenses: number;
  totalSalaries: number;
  materialCosts: number;
  fuelCosts: number;
  driverPayments: number;
  profit: number;
  profitMargin: number; // Percentage
}

export interface BagPrice {
  id?: number;
  amount: number; // Price per bag (e.g., 250, 270, 300)
  label?: string; // Optional label like "Standard", "Premium", etc.
  sortOrder: number; // Display order
  isActive: boolean; // Show/hide from users
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MaterialPrice {
  id?: number;
  type: 'sachet_roll' | 'packing_nylon';
  cost: number; // Cost per roll/package
  bagsPerUnit: number; // Number of bags per roll/package
  label?: string; // Optional label like "Supplier A", "Premium Quality", etc.
  sortOrder: number; // Display order
  isActive: boolean; // Show/hide from users
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Settings {
  id?: number;
  // Material Costs - Legacy single values (for backward compatibility)
  sachetRollCost: number; // Price per roll (deprecated - use materialPrices)
  sachetRollBagsPerRoll: number; // Number of bags per roll (deprecated - use materialPrices)
  packingNylonCost: number; // Price per package (deprecated - use materialPrices)
  packingNylonBagsPerPackage: number; // Number of bags per package (deprecated - use materialPrices)
  // Material Prices - DYNAMIC ARRAYS
  materialPrices?: MaterialPrice[]; // Array of material prices (unlimited)
  // Sales Prices - DYNAMIC ARRAY
  bagPrices: BagPrice[]; // Array of bag prices (unlimited)
  // Legacy fields for backward compatibility
  salesPrice1?: number; // Deprecated - use bagPrices[0]
  salesPrice2?: number; // Deprecated - use bagPrices[1]
  // Inventory settings
  inventoryLowThreshold?: number; // Alert when bags below this number (default: 4000)
  updatedAt?: Date;
}

// Default settings (fallback)
export const DEFAULT_SETTINGS: Settings = {
  sachetRollCost: 31000,
  sachetRollBagsPerRoll: 450,
  packingNylonCost: 100000,
  packingNylonBagsPerPackage: 10000,
  bagPrices: [
    { amount: 250, label: 'Standard', sortOrder: 1, isActive: true },
    { amount: 270, label: 'Premium', sortOrder: 2, isActive: true },
  ],
  salesPrice1: 250, // Deprecated
  salesPrice2: 270, // Deprecated
};

// Legacy constant for backward compatibility (will be replaced by settings)
export const MATERIAL_COSTS = {
  sachet_roll: {
    cost: 31000,
    bagsPerRoll: 450,
    costPerBag: 31000 / 450
  },
  packing_nylon: {
    cost: 100000,
    bagsPerPackage: 10000,
    costPerBag: 100000 / 10000
  }
};

