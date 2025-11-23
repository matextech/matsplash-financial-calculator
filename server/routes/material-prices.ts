import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper function to transform database fields to frontend format
function transformMaterialPrice(price: any) {
  if (!price) return null;
  return {
    id: price.id,
    type: price.type,
    cost: parseFloat(price.cost),
    bagsPerUnit: price.bags_per_unit,
    label: price.label,
    sortOrder: price.sort_order,
    isActive: price.is_active === 1 || price.is_active === true,
    createdAt: price.created_at,
    updatedAt: price.updated_at,
  };
}

// Get all material prices
router.get('/', async (req, res) => {
  try {
    const { type, includeInactive } = req.query;
    
    let query = db('material_prices').select('*').orderBy('sort_order', 'asc');
    
    if (type) {
      query = query.where('type', type as string);
    }
    
    if (!includeInactive) {
      query = query.where('is_active', 1);
    }
    
    const prices = await query;
    
    res.json({
      success: true,
      data: prices.map(transformMaterialPrice)
    });
  } catch (error) {
    console.error('Error fetching material prices:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get material price by ID
router.get('/:id', async (req, res) => {
  try {
    const price = await db('material_prices').where('id', req.params.id).first();
    
    if (!price) {
      return res.status(404).json({
        success: false,
        message: 'Material price not found'
      });
    }
    
    res.json({
      success: true,
      data: transformMaterialPrice(price)
    });
  } catch (error) {
    console.error('Error fetching material price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new material price
router.post('/', async (req, res) => {
  try {
    const { type, cost, bagsPerUnit, label, sortOrder, isActive } = req.body;

    if (!type || !['sachet_roll', 'packing_nylon'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid type (sachet_roll or packing_nylon) is required'
      });
    }

    if (!cost || cost < 0 || !bagsPerUnit || bagsPerUnit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid cost and bags per unit are required'
      });
    }

    const [id] = await db('material_prices').insert({
      type,
      cost,
      bags_per_unit: bagsPerUnit,
      label: label || null,
      sort_order: sortOrder || 0,
      is_active: isActive !== undefined ? (isActive ? 1 : 0) : 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const newPrice = await db('material_prices').where('id', id).first();

    res.json({
      success: true,
      data: transformMaterialPrice(newPrice),
      message: 'Material price created successfully'
    });
  } catch (error) {
    console.error('Error creating material price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update material price
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.type !== undefined) {
      if (!['sachet_roll', 'packing_nylon'].includes(req.body.type)) {
        return res.status(400).json({
          success: false,
          message: 'Valid type (sachet_roll or packing_nylon) is required'
        });
      }
      updateData.type = req.body.type;
    }
    if (req.body.cost !== undefined) updateData.cost = req.body.cost;
    if (req.body.bagsPerUnit !== undefined) updateData.bags_per_unit = req.body.bagsPerUnit;
    if (req.body.label !== undefined) updateData.label = req.body.label;
    if (req.body.sortOrder !== undefined) updateData.sort_order = req.body.sortOrder;
    if (req.body.isActive !== undefined) updateData.is_active = req.body.isActive ? 1 : 0;

    await db('material_prices').where('id', id).update(updateData);

    const updatedPrice = await db('material_prices').where('id', id).first();

    res.json({
      success: true,
      data: transformMaterialPrice(updatedPrice),
      message: 'Material price updated successfully'
    });
  } catch (error) {
    console.error('Error updating material price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete material price
router.delete('/:id', async (req, res) => {
  try {
    await db('material_prices').where('id', req.params.id).delete();
    
    res.json({
      success: true,
      message: 'Material price deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting material price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

