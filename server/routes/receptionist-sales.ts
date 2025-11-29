import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper function to transform database fields to frontend format
function transformSale(sale: any) {
  if (!sale) return null;
  
  // Parse price_breakdown if it exists
  let priceBreakdown = null;
  if (sale.price_breakdown) {
    try {
      priceBreakdown = JSON.parse(sale.price_breakdown);
    } catch (e) {
      console.error('Error parsing price_breakdown:', e);
    }
  }
  
  return {
    id: sale.id,
    date: sale.date,
    driverId: sale.driver_id,
    driverName: sale.driver_name,
    saleType: sale.sale_type,
    bagsAtPrice1: sale.bags_at_price_1,
    bagsAtPrice2: sale.bags_at_price_2,
    priceBreakdown: priceBreakdown, // NEW - dynamic pricing
    totalBags: sale.total_bags,
    expectedAmount: sale.expected_amount ? parseFloat(sale.expected_amount) : 0,
    submittedBy: sale.submitted_by,
    submittedAt: sale.submitted_at,
    isSubmitted: sale.is_submitted === 1 || sale.is_submitted === true,
    notes: sale.notes,
    createdAt: sale.created_at,
    updatedAt: sale.updated_at,
  };
}

// Get all receptionist sales (with optional date filtering)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = db('receptionist_sales').select('*').orderBy('date', 'desc');
    
    if (startDate && endDate) {
      // Convert dates to YYYY-MM-DD format and use inclusive range
      const start = typeof startDate === 'string' ? startDate.split('T')[0] : String(startDate).split('T')[0];
      const end = typeof endDate === 'string' ? endDate.split('T')[0] : String(endDate).split('T')[0];
      query = query.whereBetween('date', [start, end]);
    }
    
    const sales = await query;
    
    res.json({
      success: true,
      data: sales.map(transformSale)
    });
  } catch (error) {
    console.error('Error fetching receptionist sales:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get sale by ID
router.get('/:id', async (req, res) => {
  try {
    const sale = await db('receptionist_sales').where('id', req.params.id).first();
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    res.json({
      success: true,
      data: transformSale(sale)
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new sale
router.post('/', async (req, res) => {
  try {
    const { 
      date, 
      driverId, 
      driverName, 
      saleType, 
      bagsAtPrice1, 
      bagsAtPrice2,
      priceBreakdown, // NEW - dynamic pricing
      totalBags,
      expectedAmount, // NEW - calculated expected amount from frontend
      submittedBy,
      isSubmitted,
      notes 
    } = req.body;

    if (!date || totalBags === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Date and total bags are required'
      });
    }

    const insertData: any = {
      date: new Date(date).toISOString().split('T')[0],
      driver_id: driverId || null,
      driver_name: driverName || null,
      sale_type: saleType,
      bags_at_price_1: bagsAtPrice1 || 0,
      bags_at_price_2: bagsAtPrice2 || 0,
      total_bags: totalBags,
      submitted_by: submittedBy,
      submitted_at: isSubmitted ? new Date().toISOString() : null,
      is_submitted: isSubmitted ? 1 : 0,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add price_breakdown if provided (dynamic pricing)
    if (priceBreakdown && Array.isArray(priceBreakdown)) {
      insertData.price_breakdown = JSON.stringify(priceBreakdown);
    }
    
    // Use expectedAmount from frontend if provided, otherwise calculate from priceBreakdown
    if (expectedAmount !== undefined && expectedAmount > 0) {
      insertData.expected_amount = expectedAmount;
    } else if (priceBreakdown && Array.isArray(priceBreakdown)) {
      // Calculate expected amount from price breakdown
      insertData.expected_amount = priceBreakdown.reduce((sum: number, item: any) => 
        sum + (item.bags * item.amount), 0
      );
    } else {
      // Fallback to legacy calculation (will be removed once all sales use dynamic pricing)
      insertData.expected_amount = 0;
    }

    const [id] = await db('receptionist_sales').insert(insertData);

    const newSale = await db('receptionist_sales').where('id', id).first();

    res.json({
      success: true,
      data: transformSale(newSale),
      message: 'Sale created successfully'
    });
  } catch (error) {
    console.error('Error creating sale:', error);
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
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.date !== undefined) updateData.date = new Date(req.body.date).toISOString().split('T')[0];
    if (req.body.driverId !== undefined) updateData.driver_id = req.body.driverId;
    if (req.body.driverName !== undefined) updateData.driver_name = req.body.driverName;
    if (req.body.saleType !== undefined) updateData.sale_type = req.body.saleType;
    if (req.body.bagsAtPrice1 !== undefined) updateData.bags_at_price_1 = req.body.bagsAtPrice1;
    if (req.body.bagsAtPrice2 !== undefined) updateData.bags_at_price_2 = req.body.bagsAtPrice2;
    if (req.body.priceBreakdown !== undefined) {
      // NEW - dynamic pricing
      if (req.body.priceBreakdown && Array.isArray(req.body.priceBreakdown)) {
        updateData.price_breakdown = JSON.stringify(req.body.priceBreakdown);
        // Recalculate expected amount from price breakdown
        updateData.expected_amount = req.body.priceBreakdown.reduce((sum: number, item: any) => 
          sum + (item.bags * item.amount), 0
        );
      } else {
        updateData.price_breakdown = null;
      }
    }
    if (req.body.totalBags !== undefined) updateData.total_bags = req.body.totalBags;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.isSubmitted !== undefined) {
      updateData.is_submitted = req.body.isSubmitted ? 1 : 0;
      if (req.body.isSubmitted) {
        updateData.submitted_at = new Date().toISOString();
      }
    }

    await db('receptionist_sales').where('id', id).update(updateData);

    const updatedSale = await db('receptionist_sales').where('id', id).first();

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
    await db('receptionist_sales').where('id', req.params.id).delete();
    
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

