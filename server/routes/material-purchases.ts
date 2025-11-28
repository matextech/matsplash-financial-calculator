import express from 'express';
import { db } from '../database';

const router = express.Router();

// Transform database row to frontend format
function transformMaterialPurchase(purchase: any) {
  return {
    id: purchase.id,
    type: purchase.type,
    quantity: purchase.quantity,
    cost: parseFloat(purchase.cost) || 0,
    date: purchase.date,
    notes: purchase.notes,
    createdAt: purchase.created_at,
  };
}

// Get material purchases with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('material_purchases').select('*').orderBy('date', 'desc');

    if (req.query.startDate) {
      query = query.where('date', '>=', req.query.startDate);
    }
    if (req.query.endDate) {
      // Use < instead of <= since we're adding 1 day on the frontend to make it inclusive
      query = query.where('date', '<', req.query.endDate);
    }

    const purchases = await query;
    const transformedPurchases = purchases.map(transformMaterialPurchase);
    res.json(transformedPurchases);
  } catch (error) {
    console.error('Error fetching material purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create material purchase
router.post('/', async (req, res) => {
  try {
    const { type, quantity, cost, date, notes } = req.body;

    if (!type || !quantity || !cost || !date) {
      return res.status(400).json({
        success: false,
        message: 'Type, quantity, cost, and date are required'
      });
    }

    const [id] = await db('material_purchases').insert({
      type: type,
      quantity: quantity,
      cost: cost,
      date: date,
      notes: notes || null,
      created_at: new Date().toISOString()
    });

    const newPurchase = await db('material_purchases').where('id', id).first();

    res.json({
      success: true,
      data: transformMaterialPurchase(newPurchase),
      message: 'Material purchase created successfully'
    });
  } catch (error: any) {
    console.error('Error creating material purchase:', error);
    
    // Check for unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate material purchase record already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update material purchase
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity, cost, date, notes } = req.body;

    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (cost !== undefined) updateData.cost = cost;
    if (date !== undefined) updateData.date = date;
    if (notes !== undefined) updateData.notes = notes;

    await db('material_purchases').where('id', id).update(updateData);

    const updatedPurchase = await db('material_purchases').where('id', id).first();

    if (!updatedPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Material purchase not found'
      });
    }

    res.json({
      success: true,
      data: transformMaterialPurchase(updatedPurchase),
      message: 'Material purchase updated successfully'
    });
  } catch (error) {
    console.error('Error updating material purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete material purchase
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await db('material_purchases').where('id', id).first();
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Material purchase not found'
      });
    }

    await db('material_purchases').where('id', id).delete();

    res.json({
      success: true,
      message: 'Material purchase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting material purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

