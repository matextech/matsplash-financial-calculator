import express from 'express';
import { db } from '../database';

const router = express.Router();

// Transform database row to frontend format
function transformSale(sale: any) {
  return {
    id: sale.id,
    driverName: sale.driver_name,
    driverEmail: sale.driver_email,
    employeeId: sale.employee_id,
    bagsSold: sale.bags_sold,
    pricePerBag: parseFloat(sale.price_per_bag) || 0,
    totalAmount: parseFloat(sale.total_amount) || 0,
    date: sale.date,
    notes: sale.notes,
    createdAt: sale.created_at,
    sachetRollPriceId: sale.sachet_roll_price_id,
    packingNylonPriceId: sale.packing_nylon_price_id,
  };
}

// Get sales with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('sales').select('*').orderBy('date', 'desc');

    if (req.query.startDate) {
      query = query.where('date', '>=', req.query.startDate);
    }
    if (req.query.endDate) {
      query = query.where('date', '<=', req.query.endDate);
    }

    const sales = await query;
    console.log(`Sales API - Query params:`, { startDate: req.query.startDate, endDate: req.query.endDate });
    console.log(`Sales API - Found ${sales.length} sales`);
    
    const transformedSales = sales.map(transformSale);
    console.log(`Sales API - Transformed ${transformedSales.length} sales`);
    
    res.json(transformedSales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

