import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper function to transform database fields to frontend format
function transformSettings(settings: any) {
  return {
    id: settings.id,
    sachetRollCost: parseFloat(settings.sachet_roll_cost) || 0,
    sachetRollBagsPerRoll: settings.sachet_roll_bags_per_roll || 0,
    packingNylonCost: parseFloat(settings.packing_nylon_cost) || 0,
    packingNylonBagsPerPackage: settings.packing_nylon_bags_per_package || 0,
    salesPrice1: parseFloat(settings.sales_price_1) || 0,
    salesPrice2: parseFloat(settings.sales_price_2) || 0,
    updatedAt: settings.updated_at
  };
}

// Get settings (always returns single settings object)
router.get('/', async (req, res) => {
  try {
    let settings = await db('settings').first();
    
    // If no settings exist, create default settings
    if (!settings) {
      const [id] = await db('settings').insert({
        sachet_roll_cost: 31000,
        sachet_roll_bags_per_roll: 450,
        packing_nylon_cost: 100000,
        packing_nylon_bags_per_package: 10000,
        sales_price_1: 250,
        sales_price_2: 270,
        updated_at: new Date().toISOString()
      });
      
      settings = await db('settings').where('id', id).first();
    }
    
    res.json({
      success: true,
      data: transformSettings(settings)
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.sachetRollCost !== undefined) updateData.sachet_roll_cost = req.body.sachetRollCost;
    if (req.body.sachetRollBagsPerRoll !== undefined) updateData.sachet_roll_bags_per_roll = req.body.sachetRollBagsPerRoll;
    if (req.body.packingNylonCost !== undefined) updateData.packing_nylon_cost = req.body.packingNylonCost;
    if (req.body.packingNylonBagsPerPackage !== undefined) updateData.packing_nylon_bags_per_package = req.body.packingNylonBagsPerPackage;
    if (req.body.salesPrice1 !== undefined) updateData.sales_price_1 = req.body.salesPrice1;
    if (req.body.salesPrice2 !== undefined) updateData.sales_price_2 = req.body.salesPrice2;

    // Get first settings record (should only be one)
    const existingSettings = await db('settings').first();
    
    if (existingSettings) {
      // Update existing settings
      await db('settings').where('id', existingSettings.id).update(updateData);
    } else {
      // Create new settings if none exist
      await db('settings').insert(updateData);
    }

    const updatedSettings = await db('settings').first();

    res.json({
      success: true,
      data: transformSettings(updatedSettings),
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

