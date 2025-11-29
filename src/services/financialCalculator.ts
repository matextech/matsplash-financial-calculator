import { 
  FinancialReport, 
  Employee, 
  Expense, 
  MaterialPurchase, 
  Sale, 
  PackerEntry,
  SalaryPayment,
  MATERIAL_COSTS,
  DEFAULT_SETTINGS
} from '../types';
import { apiService } from './apiService';

export class FinancialCalculator {
  static async generateReport(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): Promise<FinancialReport> {
    // Get all data for the period from API
    let sales, expenses, materialPurchases, salaryPayments;
    try {
      [sales, expenses, materialPurchases, salaryPayments] = await Promise.all([
        apiService.getSales(startDate, endDate),
        apiService.getExpenses(startDate, endDate),
        apiService.getMaterialPurchases(startDate, endDate),
        apiService.getSalaryPayments(startDate, endDate)
      ]);
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('FinancialCalculator - Error fetching data:', error);
      }
      throw error;
    }

    // Ensure we have arrays (handle potential undefined/null)
    const safeSales = Array.isArray(sales) ? sales : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const safeMaterialPurchases = Array.isArray(materialPurchases) ? materialPurchases : [];
    const safeSalaryPayments = Array.isArray(salaryPayments) ? salaryPayments : [];

    // Debug logging in development
    if (import.meta.env?.DEV) {
      console.log('FinancialCalculator - Data fetched:', {
        sales: safeSales.length,
        expenses: safeExpenses.length,
        materialPurchases: safeMaterialPurchases.length,
        salaryPayments: safeSalaryPayments.length,
        dateRange: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
        materialPurchasesData: safeMaterialPurchases.slice(0, 3),
        salaryPaymentsData: safeSalaryPayments.slice(0, 3)
      });
    }

    // Calculate revenue
    const totalRevenue = safeSales.reduce((sum, sale) => {
      const amount = sale.totalAmount || sale.total_amount || 0;
      return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
    }, 0);
    

    // Calculate expenses - ensure ALL expenses are captured
    // Filter for fuel expenses (generator fuel)
    const fuelCosts = safeExpenses
      .filter(e => {
        const type = e.type || (e as any).type;
        return type === 'fuel' || type === 'generator_fuel';
      })
      .reduce((sum, e) => {
        const amount = e.amount || 0;
        return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
      }, 0);

    // Filter for driver fuel expenses
    const driverPayments = safeExpenses
      .filter(e => {
        const type = e.type || (e as any).type;
        return type === 'driver_fuel' || type === 'driver_payment';
      })
      .reduce((sum, e) => {
        const amount = e.amount || 0;
        return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
      }, 0);

    // Filter for other expenses - use same robust pattern
    const otherExpenses = safeExpenses
      .filter(e => {
        const type = e.type || (e as any).type;
        return type === 'other';
      })
      .reduce((sum, e) => {
        const amount = e.amount || 0;
        return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
      }, 0);

    // Catch-all for any expenses that don't match known types (safety net)
    const uncategorizedExpenses = safeExpenses
      .filter(e => {
        const type = e.type || (e as any).type;
        return type !== 'fuel' && 
               type !== 'generator_fuel' && 
               type !== 'driver_fuel' && 
               type !== 'driver_payment' && 
               type !== 'other';
      })
      .reduce((sum, e) => {
        const amount = e.amount || 0;
        return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
      }, 0);


    // Calculate actual material purchase costs for this period
    let materialCosts = 0;
    for (const purchase of safeMaterialPurchases) {
      const cost = purchase.cost || 0;
      // Include all material purchase types (sachet_roll, packing_nylon, and any others)
      const purchaseCost = typeof cost === 'number' ? cost : parseFloat(String(cost)) || 0;
      materialCosts += purchaseCost;
    }

    // Calculate total material cost per bag sold (for profit calculation)
    const totalBagsSold = safeSales.reduce((sum, sale) => sum + (sale.bagsSold || 0), 0);
    const sachetRollsPurchased = safeMaterialPurchases
      .filter(m => m.type === 'sachet_roll')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);
    const packingNylonPurchased = safeMaterialPurchases
      .filter(m => m.type === 'packing_nylon')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);

    // Get settings for material costs from API
    let settings;
    try {
      const settingsResponse = await apiService.getSettings();
      // Handle both { success: true, data: {...} } and direct object responses
      settings = settingsResponse?.data || settingsResponse || DEFAULT_SETTINGS;
      
      // Ensure we have valid numeric values, fallback to defaults if missing
      if (!settings.sachetRollCost || settings.sachetRollCost === 0) {
        settings.sachetRollCost = DEFAULT_SETTINGS.sachetRollCost;
      }
      if (!settings.sachetRollBagsPerRoll || settings.sachetRollBagsPerRoll === 0) {
        settings.sachetRollBagsPerRoll = DEFAULT_SETTINGS.sachetRollBagsPerRoll;
      }
      if (!settings.packingNylonCost || settings.packingNylonCost === 0) {
        settings.packingNylonCost = DEFAULT_SETTINGS.packingNylonCost;
      }
      if (!settings.packingNylonBagsPerPackage || settings.packingNylonBagsPerPackage === 0) {
        settings.packingNylonBagsPerPackage = DEFAULT_SETTINGS.packingNylonBagsPerPackage;
      }
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('Error loading settings, using defaults');
      }
      settings = DEFAULT_SETTINGS;
    }

    // Calculate material cost allocated to this period
    // Use selected material prices from sales if available, otherwise use default settings
    // Load material prices for calculations
    let materialPricesMap: { [key: number]: any } = {};
    try {
      const allMaterialPrices = await apiService.getMaterialPrices(undefined, true); // Include inactive
      if (Array.isArray(allMaterialPrices)) {
        allMaterialPrices.forEach(price => {
          if (price && price.id) {
            materialPricesMap[price.id] = price;
          }
        });
      }
    } catch (error) {
      // Silently fail - material prices are optional for calculations
      // Will fall back to default material costs from settings
      // Material prices not available, using default costs
    }
    
    // Calculate material cost per bag for each sale using selected prices or defaults
    let totalMaterialCostAllocated = 0;
    for (const sale of safeSales) {
      let sachetCostPerBag: number;
      let nylonCostPerBag: number;
      
      // Use selected material price if available, otherwise use default from settings
      if (sale.sachetRollPriceId && materialPricesMap[sale.sachetRollPriceId]) {
        const selectedPrice = materialPricesMap[sale.sachetRollPriceId];
        const cost = selectedPrice.cost || 0;
        const bagsPerUnit = selectedPrice.bagsPerUnit || 1;
        sachetCostPerBag = bagsPerUnit > 0 ? cost / bagsPerUnit : 0;
      } else {
        const cost = settings.sachetRollCost || DEFAULT_SETTINGS.sachetRollCost;
        const bagsPerRoll = settings.sachetRollBagsPerRoll || DEFAULT_SETTINGS.sachetRollBagsPerRoll;
        sachetCostPerBag = bagsPerRoll > 0 ? cost / bagsPerRoll : 0;
      }
      
      if (sale.packingNylonPriceId && materialPricesMap[sale.packingNylonPriceId]) {
        const selectedPrice = materialPricesMap[sale.packingNylonPriceId];
        const cost = selectedPrice.cost || 0;
        const bagsPerUnit = selectedPrice.bagsPerUnit || 1;
        nylonCostPerBag = bagsPerUnit > 0 ? cost / bagsPerUnit : 0;
      } else {
        const cost = settings.packingNylonCost || DEFAULT_SETTINGS.packingNylonCost;
        const bagsPerPackage = settings.packingNylonBagsPerPackage || DEFAULT_SETTINGS.packingNylonBagsPerPackage;
        nylonCostPerBag = bagsPerPackage > 0 ? cost / bagsPerPackage : 0;
      }
      
      totalMaterialCostAllocated += (sale.bagsSold || 0) * (sachetCostPerBag + nylonCostPerBag);
    }

    // Calculate salaries - include all salary payments in the period
    const totalSalaries = safeSalaryPayments.reduce((sum, payment) => {
      const amount = payment.totalAmount || payment.total_amount || 0;
      const paymentAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0;
      return sum + paymentAmount;
    }, 0);
    

    // Calculate total expenses
    // Include ALL expense categories:
    // 1. Fuel costs (generator fuel)
    // 2. Driver payments (driver fuel/payments)
    // 3. Other expenses
    // 4. Uncategorized expenses (safety net for any unknown types)
    // 5. Material purchase costs (actual cash outflow for materials)
    // 6. Salary payments
    const totalExpenses = fuelCosts + driverPayments + otherExpenses + uncategorizedExpenses + materialCosts + totalSalaries;

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
   * Calculate commission from sales for an employee (drivers)
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
    const allSales = await apiService.getSales(startDate, endDate);
    // Ensure we have an array
    const safeAllSales = Array.isArray(allSales) ? allSales : [];
    // Filter by employeeId - must match exactly and not be undefined/null
    const employeeSales = safeAllSales.filter(sale => 
      sale.employeeId !== undefined && 
      sale.employeeId !== null && 
      sale.employeeId === employeeId
    );
    
    const totalBags = employeeSales.reduce((sum, sale) => sum + (sale.bagsSold || 0), 0);
    
    // Get employee to get commission rate
    const employees = await apiService.getEmployees();
    // Ensure we have an array
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const employee = safeEmployees.find(e => e.id === employeeId);
    
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

  /**
   * Calculate commission from packer entries for an employee (packers)
   * @param employeeId - The employee ID
   * @param startDate - Optional start date for filtering entries
   * @param endDate - Optional end date for filtering entries
   * @returns Object with total bags packed and calculated commission
   */
  static async calculateCommissionFromPackerEntries(
    employeeId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ totalBags: number; commission: number; entries: PackerEntry[] }> {
    // Get packer entries from the packer_entries table
    const allEntries = await apiService.getPackerEntries(startDate, endDate);
    // Ensure we have an array
    const safeAllEntries = Array.isArray(allEntries) ? allEntries : [];
    // Filter by employeeId - must match exactly and not be undefined/null
    const employeeEntries = safeAllEntries.filter(entry => 
      entry.employeeId !== undefined && 
      entry.employeeId !== null && 
      entry.employeeId === employeeId
    );
    
    const totalBags = employeeEntries.reduce((sum, entry) => sum + (entry.bagsPacked || 0), 0);
    
    // Get employee to get commission rate
    const employees = await apiService.getEmployees();
    // Ensure we have an array
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const employee = safeEmployees.find(e => e.id === employeeId);
    
    let commission = 0;
    if (employee && employee.commissionRate) {
      commission = totalBags * employee.commissionRate;
    }
    
    return {
      totalBags,
      commission,
      entries: employeeEntries
    };
  }
}

