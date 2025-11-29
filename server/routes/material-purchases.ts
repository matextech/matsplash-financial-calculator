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

// Normalize any incoming date value to YYYY-MM-DD (date-only, no time)
function normalizeDate(input: any): string {
  if (!input) return input;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    return input;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get material purchases with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('material_purchases').select('*').orderBy('date', 'desc');

    if (req.query.startDate) {
      // Dates are stored as YYYY-MM-DD strings, so direct string comparison works
      // Normalize the startDate to YYYY-MM-DD format
      const startDateParam = Array.isArray(req.query.startDate) ? req.query.startDate[0] : req.query.startDate;
      const startDateStr = typeof startDateParam === 'string' 
        ? startDateParam.split('T')[0] 
        : String(startDateParam).split('T')[0];
      query = query.where('date', '>=', startDateStr);
    }
    if (req.query.endDate) {
      // Normalize the endDate to YYYY-MM-DD format
      // Use < instead of <= since we're adding 1 day on the frontend to make it inclusive
      const endDateParam = Array.isArray(req.query.endDate) ? req.query.endDate[0] : req.query.endDate;
      const endDateStr = typeof endDateParam === 'string' 
        ? endDateParam.split('T')[0] 
        : String(endDateParam).split('T')[0];
      query = query.where('date', '<', endDateStr);
    }

    const purchases = await query;
    
    // Debug logging
    console.log('Material purchases query:', {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      count: purchases.length,
      sample: purchases.slice(0, 2)
    });
    
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

    const normalizedDate = normalizeDate(date);

    const [id] = await db('material_purchases').insert({
      type: type,
      quantity: quantity,
      cost: cost,
      date: normalizedDate,
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
    if (date !== undefined) updateData.date = normalizeDate(date);
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

