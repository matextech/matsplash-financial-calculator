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
      query = query.where('date', '<=', req.query.endDate);
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

export default router;

