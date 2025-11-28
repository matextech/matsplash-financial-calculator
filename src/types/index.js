// Default settings (fallback)
export const DEFAULT_SETTINGS = {
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
