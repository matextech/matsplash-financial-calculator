import express from 'express';
import { db } from '../database';

const router = express.Router();

// Get all settlements (with optional date filtering)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = db('settlements').select('*').orderBy('date', 'desc');
    
    if (startDate && endDate) {
      query = query.whereBetween('date', [startDate as string, endDate as string]);
    }
    
    const settlements = await query;
    
    res.json({
      success: true,
      data: settlements
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get settlement by ID
router.get('/:id', async (req, res) => {
  try {
    const settlement = await db('settlements').where('id', req.params.id).first();
    
    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found'
      });
    }
    
    res.json({
      success: true,
      data: settlement
    });
  } catch (error) {
    console.error('Error fetching settlement:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new settlement
router.post('/', async (req, res) => {
  try {
    const { 
      date, 
      receptionistSaleId,
      expectedAmount,
      settledAmount,
      remainingBalance,
      isSettled,
      settledBy,
      settledAt,
      notes 
    } = req.body;

    if (!date || !receptionistSaleId || expectedAmount === undefined || settledAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Date, receptionist sale ID, expected amount, and settled amount are required'
      });
    }

    const [id] = await db('settlements').insert({
      date: new Date(date).toISOString().split('T')[0],
      receptionist_sale_id: receptionistSaleId,
      expected_amount: expectedAmount,
      settled_amount: settledAmount,
      remaining_balance: remainingBalance || 0,
      is_settled: isSettled ? 1 : 0,
      settled_by: settledBy,
      settled_at: settledAt ? new Date(settledAt).toISOString() : null,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const newSettlement = await db('settlements').where('id', id).first();

    res.json({
      success: true,
      data: newSettlement,
      message: 'Settlement created successfully'
    });
  } catch (error) {
    console.error('Error creating settlement:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update settlement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.date !== undefined) updateData.date = new Date(req.body.date).toISOString().split('T')[0];
    if (req.body.receptionistSaleId !== undefined) updateData.receptionist_sale_id = req.body.receptionistSaleId;
    if (req.body.expectedAmount !== undefined) updateData.expected_amount = req.body.expectedAmount;
    if (req.body.settledAmount !== undefined) updateData.settled_amount = req.body.settledAmount;
    if (req.body.remainingBalance !== undefined) updateData.remaining_balance = req.body.remainingBalance;
    if (req.body.isSettled !== undefined) updateData.is_settled = req.body.isSettled ? 1 : 0;
    if (req.body.settledAt !== undefined) updateData.settled_at = req.body.settledAt ? new Date(req.body.settledAt).toISOString() : null;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    await db('settlements').where('id', id).update(updateData);

    const updatedSettlement = await db('settlements').where('id', id).first();

    res.json({
      success: true,
      data: updatedSettlement,
      message: 'Settlement updated successfully'
    });
  } catch (error) {
    console.error('Error updating settlement:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete settlement
router.delete('/:id', async (req, res) => {
  try {
    await db('settlements').where('id', req.params.id).delete();
    
    res.json({
      success: true,
      message: 'Settlement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting settlement:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

