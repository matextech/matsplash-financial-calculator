import { apiService } from './apiService';
import { MaterialPurchase, Sale, Settings, DEFAULT_SETTINGS } from '../types';

export interface InventoryStatus {
  sachetRolls: {
    totalRolls: number;
    totalBagsCapacity: number;
    remainingBags: number;
    usedBags: number;
  };
  packingNylon: {
    totalPackages: number;
    totalBagsCapacity: number;
    remainingBags: number;
    usedBags: number;
  };
  totalRemainingBags: number;
  totalUsedBags: number;
  needsRestock: boolean;
  restockThreshold: number; // Alert when below this number of bags
}

export class InventoryService {
  /**
   * Calculate current inventory status based on purchases and sales
   */
  static async getInventoryStatus(restockThreshold?: number): Promise<InventoryStatus> {
    try {
      // Get all material purchases and sales from API
      const [purchases, sales, settings] = await Promise.all([
        apiService.getMaterialPurchases(),
        apiService.getSales(),
        apiService.getSettings()
      ]);

      // Ensure we have arrays
      const safePurchases = Array.isArray(purchases) ? purchases : [];
      const safeSales = Array.isArray(sales) ? sales : [];
      
      // Handle settings response - unwrap if needed (API returns { success: true, data: {...} } or direct object)
      const settingsData = settings?.data || settings || DEFAULT_SETTINGS;
      const effectiveSettings = settingsData || DEFAULT_SETTINGS;
      
      // Use threshold from settings if not provided, default to 4000
      const effectiveThreshold = restockThreshold !== undefined 
        ? restockThreshold 
        : (effectiveSettings.inventoryLowThreshold || DEFAULT_SETTINGS.inventoryLowThreshold || 4000);

      // Calculate total capacity from purchases
      let totalSachetRolls = 0;
      let totalPackingNylon = 0;

      for (const purchase of safePurchases) {
        if (purchase.type === 'sachet_roll') {
          totalSachetRolls += purchase.quantity || 0;
        } else if (purchase.type === 'packing_nylon') {
          totalPackingNylon += purchase.quantity || 0;
        }
      }

      const sachetRollBagsCapacity = totalSachetRolls * (effectiveSettings.sachetRollBagsPerRoll || 450);
      const packingNylonBagsCapacity = totalPackingNylon * (effectiveSettings.packingNylonBagsPerPackage || 10000);

      // Calculate total bags sold
      const totalBagsSold = safeSales.reduce((sum, sale) => {
        const bags = sale.bagsSold || sale.bags_sold || 0;
        return sum + (typeof bags === 'number' ? bags : parseInt(String(bags)) || 0);
      }, 0);

      // Calculate remaining inventory
      // Both materials are needed for each bag, so effective capacity is the minimum
      const effectiveCapacity = Math.min(sachetRollBagsCapacity, packingNylonBagsCapacity);
      const remainingBags = Math.max(0, effectiveCapacity - totalBagsSold);

      // Calculate individual material usage
      // Both materials are used in 1:1 ratio, so used bags is the same for both
      // But we track how much of each material's capacity has been used
      const sachetRollUsed = Math.min(totalBagsSold, sachetRollBagsCapacity);
      const packingNylonUsed = Math.min(totalBagsSold, packingNylonBagsCapacity);

      return {
        sachetRolls: {
          totalRolls: totalSachetRolls,
          totalBagsCapacity: sachetRollBagsCapacity,
          remainingBags: Math.max(0, sachetRollBagsCapacity - sachetRollUsed),
          usedBags: sachetRollUsed,
        },
        packingNylon: {
          totalPackages: totalPackingNylon,
          totalBagsCapacity: packingNylonBagsCapacity,
          remainingBags: Math.max(0, packingNylonBagsCapacity - packingNylonUsed),
          usedBags: packingNylonUsed,
        },
        totalRemainingBags: remainingBags,
        totalUsedBags: totalBagsSold,
        needsRestock: remainingBags < effectiveThreshold,
        restockThreshold: effectiveThreshold,
      };
    } catch (error) {
      console.error('Error calculating inventory status:', error);
      // Return empty inventory on error
      return {
        sachetRolls: {
          totalRolls: 0,
          totalBagsCapacity: 0,
          remainingBags: 0,
          usedBags: 0,
        },
        packingNylon: {
          totalPackages: 0,
          totalBagsCapacity: 0,
          remainingBags: 0,
          usedBags: 0,
        },
        totalRemainingBags: 0,
        totalUsedBags: 0,
        needsRestock: true,
        restockThreshold,
      };
    }
  }

  /**
   * Get detailed inventory breakdown
   */
  static async getInventoryBreakdown() {
    try {
      const [purchases, sales, settings] = await Promise.all([
        apiService.getMaterialPurchases(),
        apiService.getSales(),
        apiService.getSettings()
      ]);

      // Ensure we have arrays
      const safePurchases = Array.isArray(purchases) ? purchases : [];
      const safeSales = Array.isArray(sales) ? sales : [];
      
      const effectiveSettings = settings || DEFAULT_SETTINGS;

      // Group purchases by type
      const sachetRollPurchases = safePurchases.filter(p => p.type === 'sachet_roll');
      const packingNylonPurchases = safePurchases.filter(p => p.type === 'packing_nylon');

      // Calculate totals
      const totalSachetRolls = sachetRollPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
      const totalPackingNylon = packingNylonPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0);

      const sachetRollBagsCapacity = totalSachetRolls * (effectiveSettings.sachetRollBagsPerRoll || 450);
      const packingNylonBagsCapacity = totalPackingNylon * (effectiveSettings.packingNylonBagsPerPackage || 10000);

      const totalBagsSold = safeSales.reduce((sum, sale) => {
        const bags = sale.bagsSold || sale.bags_sold || 0;
        return sum + (typeof bags === 'number' ? bags : parseInt(String(bags)) || 0);
      }, 0);

      return {
        sachetRolls: {
          purchases: sachetRollPurchases,
          totalRolls: totalSachetRolls,
          bagsPerRoll: effectiveSettings.sachetRollBagsPerRoll,
          totalBagsCapacity: sachetRollBagsCapacity,
          usedBags: Math.min(totalBagsSold, sachetRollBagsCapacity),
          remainingBags: Math.max(0, sachetRollBagsCapacity - totalBagsSold),
        },
        packingNylon: {
          purchases: packingNylonPurchases,
          totalPackages: totalPackingNylon,
          bagsPerPackage: effectiveSettings.packingNylonBagsPerPackage,
          totalBagsCapacity: packingNylonBagsCapacity,
          usedBags: Math.min(totalBagsSold, packingNylonBagsCapacity),
          remainingBags: Math.max(0, packingNylonBagsCapacity - totalBagsSold),
        },
        totalBagsSold,
        effectiveCapacity: Math.min(sachetRollBagsCapacity, packingNylonBagsCapacity),
      };
    } catch (error) {
      console.error('Error getting inventory breakdown:', error);
      throw error;
    }
  }
}

