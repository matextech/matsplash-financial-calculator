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

// Normalize any incoming date value to YYYY-MM-DD (date-only, no time)
function normalizeDate(input: any): string {
  if (!input) return input;
  // If it's already in YYYY-MM-DD format, keep it
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

// Get sales with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('sales').select('*').orderBy('date', 'desc');

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

    const sales = await query;
    
    // Debug logging
    console.log('Sales query:', {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      count: sales.length,
      sample: sales.slice(0, 2).map(s => ({ id: s.id, date: s.date, amount: s.total_amount }))
    });
    
    const transformedSales = sales.map(transformSale);
    res.json(transformedSales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create sale
router.post('/', async (req, res) => {
  try {
    const { driverName, driverEmail, employeeId, bagsSold, pricePerBag, totalAmount, date, notes, sachetRollPriceId, packingNylonPriceId } = req.body;

    if (!driverName || !bagsSold || !pricePerBag || !date) {
      return res.status(400).json({
        success: false,
        message: 'Driver name, bags sold, price per bag, and date are required'
      });
    }

    const normalizedDate = normalizeDate(date);

    const [id] = await db('sales').insert({
      driver_name: driverName,
      driver_email: driverEmail || null,
      employee_id: employeeId || null,
      bags_sold: bagsSold,
      price_per_bag: pricePerBag,
      total_amount: totalAmount || (bagsSold * pricePerBag),
      date: normalizedDate,
      notes: notes || null,
      sachet_roll_price_id: sachetRollPriceId || null,
      packing_nylon_price_id: packingNylonPriceId || null,
      created_at: new Date().toISOString()
    });

    const newSale = await db('sales').where('id', id).first();

    res.json({
      success: true,
      data: transformSale(newSale),
      message: 'Sale created successfully'
    });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    
    // Check for unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate sale record already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update sale
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName, driverEmail, employeeId, bagsSold, pricePerBag, totalAmount, date, notes, sachetRollPriceId, packingNylonPriceId } = req.body;

    const updateData: any = {};
    if (driverName !== undefined) updateData.driver_name = driverName;
    if (driverEmail !== undefined) updateData.driver_email = driverEmail;
    if (employeeId !== undefined) updateData.employee_id = employeeId;
    if (bagsSold !== undefined) updateData.bags_sold = bagsSold;
    if (pricePerBag !== undefined) updateData.price_per_bag = pricePerBag;
    if (totalAmount !== undefined) updateData.total_amount = totalAmount;
    if (date !== undefined) updateData.date = normalizeDate(date);
    if (notes !== undefined) updateData.notes = notes;
    if (sachetRollPriceId !== undefined) updateData.sachet_roll_price_id = sachetRollPriceId;
    if (packingNylonPriceId !== undefined) updateData.packing_nylon_price_id = packingNylonPriceId;

    await db('sales').where('id', id).update(updateData);

    const updatedSale = await db('sales').where('id', id).first();

    if (!updatedSale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: transformSale(updatedSale),
      message: 'Sale updated successfully'
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await db('sales').where('id', id).first();
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await db('sales').where('id', id).delete();

    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

