import { 
  FinancialReport, 
  Employee, 
  Expense, 
  MaterialPurchase, 
  Sale, 
  SalaryPayment,
  MATERIAL_COSTS,
  DEFAULT_SETTINGS
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
    // Filter for fuel expenses (generator fuel)
    const fuelCosts = expenses
      .filter(e => {
        const type = e.type || (e as any).type;
        return type === 'fuel' || type === 'generator_fuel';
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Filter for driver fuel expenses
    const driverPayments = expenses
      .filter(e => {
        const type = e.type || (e as any).type;
        return type === 'driver_fuel' || type === 'driver_payment';
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    console.log('FinancialCalculator - Expense breakdown:', {
      totalExpenses: expenses.length,
      fuelExpenses: expenses.filter(e => {
        const type = e.type || (e as any).type;
        return type === 'fuel' || type === 'generator_fuel';
      }).length,
      driverFuelExpenses: expenses.filter(e => {
        const type = e.type || (e as any).type;
        return type === 'driver_fuel' || type === 'driver_payment';
      }).length,
      fuelCosts,
      driverPayments,
      dateRange: { start: startDate, end: endDate }
    });

    const otherExpenses = expenses
      .filter(e => e.type === 'other')
      .reduce((sum, e) => sum + e.amount, 0);

    // Calculate actual material purchase costs for this period
    let materialCosts = 0;
    for (const purchase of materialPurchases) {
      if (purchase.type === 'sachet_roll') {
        materialCosts += purchase.cost;
      } else if (purchase.type === 'packing_nylon') {
        materialCosts += purchase.cost;
      }
    }

    // Calculate total material cost per bag sold (for profit calculation)
    const totalBagsSold = sales.reduce((sum, sale) => sum + sale.bagsSold, 0);
    const sachetRollsPurchased = materialPurchases
      .filter(m => m.type === 'sachet_roll')
      .reduce((sum, m) => sum + m.quantity, 0);
    const packingNylonPurchased = materialPurchases
      .filter(m => m.type === 'packing_nylon')
      .reduce((sum, m) => sum + m.quantity, 0);

    // Get settings for material costs
    let settings;
    try {
      settings = await dbService.getSettings();
    } catch (error) {
      console.error('Error loading settings, using defaults:', error);
      settings = DEFAULT_SETTINGS;
    }

    // Calculate material cost allocated to this period (simplified - could be improved with FIFO)
    // This is used for profit calculation, but actual purchase costs are shown in expense breakdown
    const sachetCostPerBag = settings.sachetRollCost / settings.sachetRollBagsPerRoll;
    const nylonCostPerBag = settings.packingNylonCost / settings.packingNylonBagsPerPackage;
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
      materialCosts: materialCosts, // Use actual purchase costs for expense breakdown
      fuelCosts,
      driverPayments,
      profit,
      profitMargin
    };
  }

  static calculateEmployeeSalary(
    employee: Employee,
    bagsSold: number,
    period: 'first_half' | 'second_half' | 'daily' | 'weekly' | 'monthly'
  ): number {
    let total = 0;

    if (employee.salaryType === 'fixed' || employee.salaryType === 'both') {
      if (employee.fixedSalary) {
        // For payment cycles, use exactly half
        if (period === 'first_half' || period === 'second_half') {
          total += employee.fixedSalary / 2;
        } else {
          // For daily, divide monthly by ~30, weekly by 4
          const divisor = period === 'daily' ? 30 : period === 'weekly' ? 4 : 1;
          total += employee.fixedSalary / divisor;
        }
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

  /**
   * Calculate commission from sales for an employee
   * @param employeeId - The employee ID
   * @param startDate - Optional start date for filtering sales
   * @param endDate - Optional end date for filtering sales
   * @returns Object with total bags sold and calculated commission
   */
  static async calculateCommissionFromSales(
    employeeId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ totalBags: number; commission: number; sales: Sale[] }> {
    const allSales = await dbService.getSales(startDate, endDate);
    // Filter by employeeId - must match exactly and not be undefined/null
    const employeeSales = allSales.filter(sale => 
      sale.employeeId !== undefined && 
      sale.employeeId !== null && 
      sale.employeeId === employeeId
    );
    
    const totalBags = employeeSales.reduce((sum, sale) => sum + sale.bagsSold, 0);
    
    // Get employee to get commission rate
    const employees = await dbService.getEmployees();
    const employee = employees.find(e => e.id === employeeId);
    
    let commission = 0;
    if (employee && employee.commissionRate) {
      commission = totalBags * employee.commissionRate;
    }
    
    return {
      totalBags,
      commission,
      sales: employeeSales
    };
  }
}

