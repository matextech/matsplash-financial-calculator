import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper function to transform database fields to frontend format
function transformBagPrice(price: any) {
  if (!price) return null;
  return {
    id: price.id,
    price: parseFloat(price.price),
    label: price.label,
    sortOrder: price.sort_order,
    isActive: price.is_active === 1 || price.is_active === true,
    createdAt: price.created_at,
    updatedAt: price.updated_at,
  };
}

// Get all active bag prices
router.get('/', async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    let query = db('bag_prices').select('*').orderBy('sort_order', 'asc');
    
    if (!includeInactive) {
      query = query.where('is_active', 1);
    }
    
    const prices = await query;
    
    res.json({
      success: true,
      data: prices.map(transformBagPrice)
    });
  } catch (error) {
    console.error('Error fetching bag prices:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get bag price by ID
router.get('/:id', async (req, res) => {
  try {
    const price = await db('bag_prices').where('id', req.params.id).first();
    
    if (!price) {
      return res.status(404).json({
        success: false,
        message: 'Bag price not found'
      });
    }
    
    res.json({
      success: true,
      data: transformBagPrice(price)
    });
  } catch (error) {
    console.error('Error fetching bag price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new bag price
router.post('/', async (req, res) => {
  try {
    const { price, label, sortOrder } = req.body;

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    const [id] = await db('bag_prices').insert({
      price,
      label: label || null,
      sort_order: sortOrder || 0,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const newPrice = await db('bag_prices').where('id', id).first();

    res.json({
      success: true,
      data: transformBagPrice(newPrice),
      message: 'Bag price created successfully'
    });
  } catch (error) {
    console.error('Error creating bag price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update bag price
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.price !== undefined) updateData.price = req.body.price;
    if (req.body.label !== undefined) updateData.label = req.body.label;
    if (req.body.sortOrder !== undefined) updateData.sort_order = req.body.sortOrder;
    if (req.body.isActive !== undefined) updateData.is_active = req.body.isActive ? 1 : 0;

    await db('bag_prices').where('id', id).update(updateData);

    const updatedPrice = await db('bag_prices').where('id', id).first();

    res.json({
      success: true,
      data: transformBagPrice(updatedPrice),
      message: 'Bag price updated successfully'
    });
  } catch (error) {
    console.error('Error updating bag price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete bag price
router.delete('/:id', async (req, res) => {
  try {
    await db('bag_prices').where('id', req.params.id).delete();
    
    res.json({
      success: true,
      message: 'Bag price deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bag price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

