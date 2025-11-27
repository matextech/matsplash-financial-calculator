import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper function to transform database fields to frontend format
function transformSettings(settings: any) {
  if (!settings) {
    // Return default settings if null/undefined
    return {
      id: undefined,
      sachetRollCost: 31000,
      sachetRollBagsPerRoll: 450,
      packingNylonCost: 100000,
      packingNylonBagsPerPackage: 10000,
      salesPrice1: 250,
      salesPrice2: 270,
      inventoryLowThreshold: 4000,
      updatedAt: new Date().toISOString()
    };
  }
  
  return {
    id: settings.id,
    sachetRollCost: parseFloat(settings.sachet_roll_cost) || 0,
    sachetRollBagsPerRoll: settings.sachet_roll_bags_per_roll || 0,
    packingNylonCost: parseFloat(settings.packing_nylon_cost) || 0,
    packingNylonBagsPerPackage: settings.packing_nylon_bags_per_package || 0,
    salesPrice1: parseFloat(settings.sales_price_1) || 0,
    salesPrice2: parseFloat(settings.sales_price_2) || 0,
    inventoryLowThreshold: settings.inventory_low_threshold !== undefined && settings.inventory_low_threshold !== null ? settings.inventory_low_threshold : 4000,
    updatedAt: settings.updated_at
  };
}

// Get settings (always returns single settings object)
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /settings - Fetching settings...');
    
    // Check if settings table exists
    const hasSettingsTable = await db.schema.hasTable('settings');
    if (!hasSettingsTable) {
      console.error('❌ Settings table does not exist!');
      // Return default settings without database
      return res.json({
        success: true,
        data: transformSettings(null)
      });
    }
    
    let settings = await db('settings').first();
    console.log('📋 Settings from DB:', settings ? 'Found' : 'Not found');
    
    // If no settings exist, create default settings
    if (!settings) {
      console.log('📋 Creating default settings...');
      try {
        const [id] = await db('settings').insert({
          sachet_roll_cost: 31000,
          sachet_roll_bags_per_roll: 450,
          packing_nylon_cost: 100000,
          packing_nylon_bags_per_package: 10000,
          sales_price_1: 250,
          sales_price_2: 270,
          inventory_low_threshold: 4000,
          updated_at: new Date().toISOString()
        });
        
        settings = await db('settings').where('id', id).first();
        console.log('✅ Default settings created with ID:', id);
      } catch (insertError) {
        console.error('❌ Error creating default settings:', insertError);
        // Return default settings without database
        return res.json({
          success: true,
          data: transformSettings(null)
        });
      }
    }
    
    // If inventory_low_threshold doesn't exist in the column, don't try to update it
    // The database migration will handle adding the column
    // Just ensure the response has the default value if missing
    if (settings && (settings.inventory_low_threshold === undefined || settings.inventory_low_threshold === null)) {
      console.log('📋 inventory_low_threshold missing in settings, using default (4000)');
      // Don't try to update - the column might not exist yet
      // Just use default in the response
      settings.inventory_low_threshold = 4000;
    }
    
    const transformed = transformSettings(settings);
    console.log('✅ Settings transformed successfully');
    
    res.json({
      success: true,
      data: transformed
    });
  } catch (error: any) {
    console.error('❌ Error fetching settings:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error message:', error?.message);
    
    // Return default settings on error so frontend doesn't break
    res.json({
      success: true,
      data: transformSettings(null),
      warning: 'Using default settings due to database error'
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
    if (req.body.inventoryLowThreshold !== undefined) updateData.inventory_low_threshold = req.body.inventoryLowThreshold;

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

