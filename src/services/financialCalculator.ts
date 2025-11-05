import { 
  FinancialReport, 
  Employee, 
  Expense, 
  MaterialPurchase, 
  Sale, 
  SalaryPayment,
  MATERIAL_COSTS 
} from '../types';
import { dbService } from './database';

export class FinancialCalculator {
  static async generateReport(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): Promise<FinancialReport> {
    // Get all data for the period
    const [sales, expenses, materialPurchases, salaryPayments] = await Promise.all([
      dbService.getSales(startDate, endDate),
      dbService.getExpenses(startDate, endDate),
      dbService.getMaterialPurchases(startDate, endDate),
      dbService.getSalaryPayments(startDate, endDate)
    ]);

    // Calculate revenue
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Calculate expenses
    const fuelCosts = expenses
      .filter(e => e.type === 'fuel')
      .reduce((sum, e) => sum + e.amount, 0);

    const driverPayments = expenses
      .filter(e => e.type === 'driver_payment')
      .reduce((sum, e) => sum + e.amount, 0);

    const otherExpenses = expenses
      .filter(e => e.type === 'other')
      .reduce((sum, e) => sum + e.amount, 0);

    // Calculate material costs
    let materialCosts = 0;
    for (const purchase of materialPurchases) {
      if (purchase.type === 'sachet_roll') {
        materialCosts += purchase.cost;
      } else if (purchase.type === 'packing_nylon') {
        materialCosts += purchase.cost;
      }
    }

    // Calculate total material cost per bag sold
    const totalBagsSold = sales.reduce((sum, sale) => sum + sale.bagsSold, 0);
    const sachetRollsPurchased = materialPurchases
      .filter(m => m.type === 'sachet_roll')
      .reduce((sum, m) => sum + m.quantity, 0);
    const packingNylonPurchased = materialPurchases
      .filter(m => m.type === 'packing_nylon')
      .reduce((sum, m) => sum + m.quantity, 0);

    // Calculate material cost allocated to this period (simplified - could be improved with FIFO)
    const sachetCostPerBag = MATERIAL_COSTS.sachet_roll.costPerBag;
    const nylonCostPerBag = MATERIAL_COSTS.packing_nylon.costPerBag;
    const materialCostAllocated = totalBagsSold * (sachetCostPerBag + nylonCostPerBag);

    // Calculate salaries
    const totalSalaries = salaryPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);

    // Calculate total expenses
    const totalExpenses = fuelCosts + driverPayments + otherExpenses + materialCostAllocated + totalSalaries;

    // Calculate profit
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      period,
      startDate,
      endDate,
      totalRevenue,
      totalExpenses,
      totalSalaries,
      materialCosts: materialCostAllocated,
      fuelCosts,
      driverPayments,
      profit,
      profitMargin
    };
  }

  static calculateEmployeeSalary(
    employee: Employee,
    bagsSold: number,
    period: 'daily' | 'weekly' | 'monthly'
  ): number {
    let total = 0;

    if (employee.salaryType === 'fixed' || employee.salaryType === 'both') {
      if (employee.fixedSalary) {
        // For daily, divide monthly by ~30, weekly by 4
        const divisor = period === 'daily' ? 30 : period === 'weekly' ? 4 : 1;
        total += employee.fixedSalary / divisor;
      }
    }

    if (employee.salaryType === 'commission' || employee.salaryType === 'both') {
      if (employee.commissionRate) {
        // Commission is now a fixed rate per bag (e.g., ₦15 per bag for drivers, ₦4 per bag for packers)
        const commission = bagsSold * employee.commissionRate;
        total += commission;
      }
    }

    return total;
  }

  static calculateMaterialCostPerBag(): { sachet: number; nylon: number; total: number } {
    return {
      sachet: MATERIAL_COSTS.sachet_roll.costPerBag,
      nylon: MATERIAL_COSTS.packing_nylon.costPerBag,
      total: MATERIAL_COSTS.sachet_roll.costPerBag + MATERIAL_COSTS.packing_nylon.costPerBag
    };
  }
}

