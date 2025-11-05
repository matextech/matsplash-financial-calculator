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
  type: 'fuel' | 'driver_payment' | 'material' | 'other';
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
  bagsSold: number;
  pricePerBag: number;
  totalAmount: number;
  date: Date;
  notes?: string;
  createdAt?: Date;
}

export interface SalaryPayment {
  id?: number;
  employeeId: number;
  employeeName: string;
  period: 'daily' | 'weekly' | 'monthly';
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

export const MATERIAL_COSTS = {
  sachet_roll: {
    cost: 31000,
    bagsPerRoll: 450,
    costPerBag: 31000 / 450
  },
  packing_nylon: {
    cost: 100000,
    bagsPerPackage: 5000,
    costPerBag: 100000 / 5000
  }
};

